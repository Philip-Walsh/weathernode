#!/usr/bin/env node

import { WeatherMCPServer } from './mcp/server.js';

async function main() {
    const server = new WeatherMCPServer();
    await server.run();
}

main().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
});

