import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { WeatherService } from '../services/index.js';

/**
 * MCP Server implementation for weather data using stdio transport
 */
export class WeatherMCPServer {
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
        this.server.setRequestHandler(ListToolsRequestSchema, async (request) => {
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
     * Start the MCP server with stdio transport
     */
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Weather MCP server running on stdio');
    }
}
