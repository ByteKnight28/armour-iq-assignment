#!/bin/bash
# Install backend dependencies
cd backend && npm install

# Install custom MCP server dependencies
cd ../custom-mcp-server && npm install
