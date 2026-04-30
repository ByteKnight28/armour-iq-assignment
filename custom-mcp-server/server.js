import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { storeSecret, retrieveSecret, rotateSecret, auditAccess, revokeSecret } from "./src/tools.js";

const server = new McpServer({ name: "secretvault", version: "1.0.0" });

server.tool("store_secret",
    { name: z.string(), value: z.string(), description: z.string().optional() },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(storeSecret(args)) }] })
);

server.tool("retrieve_secret",
    { name: z.string() },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(retrieveSecret(args)) }] })
);

server.tool("rotate_secret",
    { name: z.string(), new_value: z.string() },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(rotateSecret(args)) }] })
);

server.tool("audit_access",
    { name: z.string() },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(auditAccess(args)) }] })
);

server.tool("revoke_secret",
    { name: z.string() },
    async (args) => ({ content: [{ type: "text", text: JSON.stringify(revokeSecret(args)) }] })
);

const transport = new StdioServerTransport();
await server.connect(transport);
