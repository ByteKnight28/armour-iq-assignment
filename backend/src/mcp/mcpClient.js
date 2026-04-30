import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const MCP_SERVERS = [
    {
        name:    "secretvault",
        command: "node",
        args:    ["../custom-mcp-server/server.js"]
    },
    {
        name:    "exa",
        command: "npx",
        args:    ["-y", "exa-mcp-server", "--tools=web_search_exa"]
    }
];

export async function discoverTools() {
    const allTools = [];

    for (const srv of MCP_SERVERS) {
        try {
            const transport = new StdioClientTransport({ command: srv.command, args: srv.args });
            const client    = new Client({ name: "agent", version: "1.0.0" }, { capabilities: {} });
            await client.connect(transport);
            const { tools } = await client.listTools();
            tools.forEach(t => allTools.push({ ...t, _serverName: srv.name, _client: client }));
            console.log(`[MCP] Connected to '${srv.name}', discovered ${tools.length} tools.`);
        } catch (err) {
            console.error(`[MCP] Failed to connect to '${srv.name}': ${err.message}`);
        }
    }

    return allTools;
}

export async function executeTool(toolName, toolArgs, allTools) {
    const tool = allTools.find(t => t.name === toolName);
    if (!tool) throw new Error(`Tool '${toolName}' not found across any connected MCP server.`);

    try {
        const result = await tool._client.callTool({ name: toolName, arguments: toolArgs });
        return result.content?.[0]?.text ?? JSON.stringify(result);
    } catch (err) {
        throw new Error(`MCP execution error on '${toolName}': ${err.message}`);
    }
}
