import { GoogleGenAI } from "@google/genai";
import policyEngine from "../policy/PolicyEngine.js";
import { discoverTools, executeTool } from "../mcp/mcpClient.js";
import { createClient } from "@supabase/supabase-js";

// Lazy-init: these are created on first use, after dotenv.config() has run
let genai    = null;
let supabase = null;

function getGenAI() {
    if (!genai) genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return genai;
}

function getSupabase() {
    if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    return supabase;
}

// Gemini 2.5 Flash pricing (per token)
const COST_INPUT  = 0.000000125;
const COST_OUTPUT = 0.000000375;

// Safety limits
const MAX_TOOL_ITERATIONS = 10;
const GEMINI_MAX_RETRIES  = 3;
const GEMINI_RETRY_DELAY  = 5000; // ms

async function callGeminiWithRetry(params) {
    for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt++) {
        try {
            return await getGenAI().models.generateContent(params);
        } catch (err) {
            const status = err.status ?? err.code;
            if ((status === 429 || status === 503) && attempt < GEMINI_MAX_RETRIES) {
                console.warn(`[Agent] Gemini ${status} error, retrying in ${GEMINI_RETRY_DELAY / 1000}s (attempt ${attempt}/${GEMINI_MAX_RETRIES})...`);
                await new Promise(r => setTimeout(r, GEMINI_RETRY_DELAY));
                continue;
            }
            throw err; // Non-retryable or final attempt
        }
    }
}

export async function runAgent(conversationId, userPrompt, history = []) {
    const mcpTools = await discoverTools();

    // Clean MCP schemas to be Gemini-compatible (whitelist approach)
    function cleanSchema(schema) {
        if (!schema || typeof schema !== "object") return schema;
        if (Array.isArray(schema)) return schema.map(cleanSchema);
        
        const ALLOWED = new Set(["type", "properties", "required", "description", "enum", "items", "nullable"]);
        const cleaned = {};
        
        for (const [key, value] of Object.entries(schema)) {
            if (!ALLOWED.has(key)) continue;
            if (key === "properties" && typeof value === "object") {
                cleaned[key] = {};
                for (const [propKey, propVal] of Object.entries(value)) {
                    cleaned[key][propKey] = cleanSchema(propVal);
                }
            } else if (key === "items" && typeof value === "object") {
                cleaned[key] = cleanSchema(value);
            } else {
                cleaned[key] = value;
            }
        }
        return cleaned;
    }

    // Convert MCP tool schemas → Gemini FunctionDeclarations (live, not hardcoded)
    const geminiFunctions = mcpTools.map(t => ({
        name:        t.name,
        description: t.description || `Tool: ${t.name}`,
        parameters:  cleanSchema(t.inputSchema)
    }));

    console.log(`[Agent] Registered ${geminiFunctions.length} tools:`, geminiFunctions.map(f => f.name).join(", "));
    const systemInstruction = `You are a secure AI agent with access to real tools. You MUST use the available tools to fulfill user requests instead of giving generic advice.

Available tool categories:
- SecretVault: store_secret, retrieve_secret, rotate_secret, audit_access, revoke_secret — Use these to manage encrypted secrets.
- Web Search: web_search_exa — Use this to search the web for current information.

When a user asks you to store, retrieve, rotate, audit, or revoke a secret, ALWAYS call the corresponding tool. Never give instructions for kubectl, AWS, or any other system — you have your own built-in secret vault.`;

    // Build messages: prepend conversation history, then add the new user prompt
    const messages = [
        ...history.map(m => ({
            role:  m.role === "bot" ? "model" : "user",
            parts: [{ text: m.content }]
        })),
        { role: "user", parts: [{ text: userPrompt }] }
    ];
    let totalInputTokens  = 0;
    let totalOutputTokens = 0;
    let iterations        = 0;

    while (iterations < MAX_TOOL_ITERATIONS) {
        iterations++;

        const response = await callGeminiWithRetry({
            model:    "gemini-2.5-flash",
            contents: messages,
            config:   {
                systemInstruction,
                tools: [{ functionDeclarations: geminiFunctions }],
            }
        });

        totalInputTokens  += response.usageMetadata?.promptTokenCount     ?? 0;
        totalOutputTokens += response.usageMetadata?.candidatesTokenCount ?? 0;

        const allParts     = response.candidates?.[0]?.content?.parts ?? [];
        // Filter out thinking/thought parts (gemini-2.5-flash returns these)
        const parts        = allParts.filter(p => !p.thought);
        const functionCall = parts.find(p => p.functionCall);

        console.log(`[Agent] Iteration ${iterations}: ${parts.length} parts, functionCall=${!!functionCall}`);

        // No tool call → agent is done, return final text
        if (!functionCall) {
            const finalText = parts.find(p => p.text)?.text ?? allParts.find(p => p.text)?.text ?? "";
            const costUsd   = (totalInputTokens * COST_INPUT) + (totalOutputTokens * COST_OUTPUT);

            await getSupabase().from("agent_logs").insert({
                conversation_id: conversationId,
                prompt:          userPrompt,
                tool_called:     null,
                policy_result:   "ALLOWED",
                input_tokens:    totalInputTokens,
                output_tokens:   totalOutputTokens,
                cost_usd:        costUsd
            });

            return { reply: finalText, inputTokens: totalInputTokens, outputTokens: totalOutputTokens, costUsd };
        }

        const { name: toolName, args: toolArgs } = functionCall.functionCall;

        // ── Policy Engine intercepts every tool call ──────────────
        const { decision, reason } = policyEngine.evaluate(toolName, toolArgs);

        if (decision === "BLOCK") {
            await getSupabase().from("agent_logs").insert({
                conversation_id: conversationId,
                prompt:          userPrompt,
                tool_called:     toolName,
                tool_args:       toolArgs,
                policy_result:   "BLOCKED",
                block_reason:    reason
            });
            messages.push({ role: "model", parts });
            messages.push({ role: "function", parts: [{ functionResponse: { name: toolName, response: { error: reason } } }] });
            continue;
        }

        if (decision === "APPROVAL") {
            await getSupabase().from("agent_logs").insert({
                conversation_id: conversationId,
                prompt:          userPrompt,
                tool_called:     toolName,
                tool_args:       toolArgs,
                policy_result:   "PENDING"
            });

            const { data: queueItem } = await getSupabase()
                .from("approval_queue")
                .insert({ tool_name: toolName, tool_args: toolArgs })
                .select().single();

            const approved = await waitForApproval(queueItem.id, 60000);

            if (!approved) {
                messages.push({ role: "model", parts });
                messages.push({ role: "function", parts: [{ functionResponse: { name: toolName, response: { error: "Human approval was denied or timed out." } } }] });
                continue;
            }
        }

        // ── Execute tool via MCP ──────────────────────────────────
        let toolResult;
        try {
            toolResult = await executeTool(toolName, toolArgs, mcpTools);
        } catch (err) {
            toolResult = `MCP Error: ${err.message}`;
        }

        await getSupabase().from("agent_logs").insert({
            conversation_id: conversationId,
            prompt:          userPrompt,
            tool_called:     toolName,
            tool_args:       toolArgs,
            policy_result:   decision,
            result:          toolResult
        });

        messages.push({ role: "model", parts });
        messages.push({ role: "function", parts: [{ functionResponse: { name: toolName, response: { result: toolResult } } }] });
    }

    // Safety: if we hit the max iterations, return what we have
    const costUsd = (totalInputTokens * COST_INPUT) + (totalOutputTokens * COST_OUTPUT);
    return {
        reply: "I reached the maximum number of tool calls for this request. Here's what I accomplished so far.",
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        costUsd
    };
}

// Fail-closed: denies if approver is offline or takes too long
async function waitForApproval(queueId, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        await new Promise(r => setTimeout(r, 2000));
        const { data } = await getSupabase()
            .from("approval_queue")
            .select("status")
            .eq("id", queueId)
            .single();
        if (data?.status === "APPROVED") return true;
        if (data?.status === "DENIED")   return false;
    }
    return false;
}
