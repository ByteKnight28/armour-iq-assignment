import { GoogleGenAI } from "@google/genai";
import policyEngine from "../policy/PolicyEngine.js";
import { discoverTools, executeTool } from "../mcp/mcpClient.js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const genai    = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Gemini 2.5 Flash pricing (per token)
const COST_INPUT  = 0.000000125;
const COST_OUTPUT = 0.000000375;

export async function runAgent(conversationId, userPrompt) {
    const mcpTools = await discoverTools();

    // Convert MCP tool schemas → Gemini FunctionDeclarations (live, not hardcoded)
    const geminiFunctions = mcpTools.map(t => ({
        name:        t.name,
        description: t.description,
        parameters:  t.inputSchema
    }));

    const messages        = [{ role: "user", parts: [{ text: userPrompt }] }];
    let totalInputTokens  = 0;
    let totalOutputTokens = 0;

    while (true) {
        const response = await genai.models.generateContent({
            model:    "gemini-2.5-flash",
            contents: messages,
            tools:    geminiFunctions.length > 0 ? [{ functionDeclarations: geminiFunctions }] : undefined
        });

        totalInputTokens  += response.usageMetadata?.promptTokenCount     ?? 0;
        totalOutputTokens += response.usageMetadata?.candidatesTokenCount ?? 0;

        const parts        = response.candidates?.[0]?.content?.parts ?? [];
        const functionCall = parts.find(p => p.functionCall);

        // No tool call → agent is done, return final text
        if (!functionCall) {
            const finalText = parts.find(p => p.text)?.text ?? "";
            const costUsd   = (totalInputTokens * COST_INPUT) + (totalOutputTokens * COST_OUTPUT);

            await supabase.from("agent_logs").insert({
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
            await supabase.from("agent_logs").insert({
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
            const { data: queueItem } = await supabase
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

        await supabase.from("agent_logs").insert({
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
}

// Fail-closed: denies if approver is offline or takes too long
async function waitForApproval(queueId, timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        await new Promise(r => setTimeout(r, 2000));
        const { data } = await supabase
            .from("approval_queue")
            .select("status")
            .eq("id", queueId)
            .single();
        if (data?.status === "APPROVED") return true;
        if (data?.status === "DENIED")   return false;
    }
    return false;
}
