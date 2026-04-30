import http from "http";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { promptFirewall } from "./src/security/promptFirewall.js";
import { runAgent }       from "./src/agent/loopController.js";
import policyEngine       from "./src/policy/PolicyEngine.js";
import { createClient }   from "@supabase/supabase-js";

// Load env ONCE here — the single source of truth
dotenv.config();

// Boot: load rules from Supabase and start WebSocket listener
await policyEngine.init();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

function setCors(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const server = http.createServer(async (req, res) => {
    setCors(res);

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
    }

    if (req.method === "GET" && req.url === "/api/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ status: "ok" }));
    }

    if (req.method === "POST" && req.url === "/api/chat") {
        let body = "";
        req.on("data", chunk => body += chunk.toString());
        req.on("end", async () => {
            try {
                const parsedBody = JSON.parse(body);
                const prompt = parsedBody.prompt ?? "";
                const conversationId = parsedBody.conversationId ?? uuidv4();
                
                // ── Prompt Firewall ──────────────────────────────
                const firewallCheck = promptFirewall(prompt);
                if (firewallCheck.blocked) {
                    // Log injection attempt to audit trail
                    await supabase.from("agent_logs").insert({
                        conversation_id: conversationId,
                        prompt:          prompt,
                        tool_called:     null,
                        policy_result:   "INJECTION",
                        block_reason:    firewallCheck.message
                    });

                    res.writeHead(403, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: firewallCheck.error, message: firewallCheck.message }));
                }

                const result = await runAgent(conversationId, prompt, parsedBody.history ?? []);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ...result, conversationId }));
            } catch (err) {
                console.error(err);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end();
});

const PORT = process.env.PORT ?? 3000;
server.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
});
