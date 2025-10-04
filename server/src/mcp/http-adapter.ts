import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Request, Response } from 'express';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { WeatherService } from '../services/index.js';

/**
 * MCP HTTP Adapter for exposing MCP server via Express HTTP endpoint
 */
export class WeatherMCPHTTPAdapter {
    private server: Server;
    private weatherService: WeatherService;

    constructor() {
        this.weatherService = new WeatherService();

        this.server = new Server({
            name: 'weather-mcp-server',
            version: '1.0.0',
        });

        this.setupToolHandlers();
    }

    /**
     * Set up MCP tool handlers for weather operations
     */
    private setupToolHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async (_request) => {
            return {
                tools: [
                    {
                        name: 'get_weather',
                        description: 'Get current weather for a specific city',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                city: {
                                    type: 'string',
                                    description: 'City name to get weather for',
                                },
                            },
                            required: ['city'],
                        },
                    },
                    {
                        name: 'get_forecast',
                        description: 'Get weather forecast for a specific city',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                city: {
                                    type: 'string',
                                    description: 'City name to get forecast for',
                                },
                                days: {
                                    type: 'number',
                                    description: 'Number of days to forecast (1-10)',
                                    minimum: 1,
                                    maximum: 10,
                                    default: 3,
                                },
                            },
                            required: ['city'],
                        },
                    },
                    {
                        name: 'get_local_weather',
                        description: 'Get current weather for the default location',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                        },
                    },
                ] as Tool[],
            };
        });

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case 'get_weather': {
                        const { city } = args as { city: string };
                        const weather = await this.weatherService.getCurrentWeather(city);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(weather, null, 2),
                                },
                            ],
                        };
                    }

                    case 'get_forecast': {
                        const { city, days = 3 } = args as { city: string; days?: number };
                        const forecast = await this.weatherService.getWeatherForecast(city, days);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(forecast, null, 2),
                                },
                            ],
                        };
                    }

                    case 'get_local_weather': {
                        const weather = await this.weatherService.getCurrentWeather();
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(weather, null, 2),
                                },
                            ],
                        };
                    }

                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }

    /**
     * Handle HTTP requests for MCP protocol
     * @param req - Express request object
     * @param res - Express response object
     */
    async handleRequest(req: Request, res: Response) {
        try {
            const request = req.body;

            // Handle MCP requests
            if (request.method === 'tools/list') {
                const result = await this.server.request({
                    method: 'tools/list',
                    params: request.params || {},
                }, ListToolsRequestSchema);
                res.json(result);
                return;
            }

            if (request.method === 'tools/call') {
                const result = await this.server.request({
                    method: 'tools/call',
                    params: request.params || {},
                }, CallToolRequestSchema);
                res.json(result);
                return;
            }

            if (request.method === 'initialize') {
                res.json({
                    jsonrpc: '2.0',
                    id: request.id,
                    result: {
                        protocolVersion: '2024-11-05',
                        capabilities: {
                            tools: {},
                        },
                        serverInfo: {
                            name: 'weather-mcp-server',
                            version: '1.0.0',
                        },
                    },
                });
                return;
            }

            // Handle notifications
            if (request.method === 'initialized') {
                res.status(200).end();
                return;
            }

            // Unknown method
            res.status(400).json({
                jsonrpc: '2.0',
                id: request.id,
                error: {
                    code: -32601,
                    message: 'Method not found',
                },
            });
        } catch (error) {
            res.status(500).json({
                jsonrpc: '2.0',
                id: req.body.id,
                error: {
                    code: -32603,
                    message: 'Internal error',
                    data: error instanceof Error ? error.message : 'Unknown error',
                },
            });
        }
    }
}
