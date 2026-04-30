import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { storeSecret, retrieveSecret, rotateSecret, auditAccess, revokeSecret } from "./src/tools.js";

const server = new McpServer({ name: "secretvault", version: "1.0.0" });

server.tool(
    "store_secret",
    "Encrypt and store a named secret in the vault. Returns success confirmation.",
    { name: z.string(), value: z.string(), description: z.string().optional() },
    async (args) => {
        try {
            return { content: [{ type: "text", text: JSON.stringify(storeSecret(args)) }] };
        } catch (err) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }] };
        }
    }
);

server.tool(
    "retrieve_secret",
    "Decrypt and return a stored secret by name. Logs access for auditing.",
    { name: z.string() },
    async (args) => {
        try {
            return { content: [{ type: "text", text: JSON.stringify(retrieveSecret(args)) }] };
        } catch (err) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }] };
        }
    }
);

server.tool(
    "rotate_secret",
    "Replace a secret's value with a new one. Archives the previous version in history.",
    { name: z.string(), new_value: z.string() },
    async (args) => {
        try {
            return { content: [{ type: "text", text: JSON.stringify(rotateSecret(args)) }] };
        } catch (err) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }] };
        }
    }
);

server.tool(
    "audit_access",
    "Return the full access log for a named secret, showing who accessed it and when.",
    { name: z.string() },
    async (args) => {
        try {
            return { content: [{ type: "text", text: JSON.stringify(auditAccess(args)) }] };
        } catch (err) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }] };
        }
    }
);

server.tool(
    "revoke_secret",
    "Permanently delete a secret from the vault. This action cannot be undone.",
    { name: z.string() },
    async (args) => {
        try {
            return { content: [{ type: "text", text: JSON.stringify(revokeSecret(args)) }] };
        } catch (err) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: err.message }) }] };
        }
    }
);

const transport = new StdioServerTransport();
await server.connect(transport);
