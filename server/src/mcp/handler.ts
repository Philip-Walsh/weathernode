import { Request, Response } from 'express';
import { WeatherService } from '../services/index.js';
import { WEATHER_TOOLS } from './tools.js';

export class MCPHandler {
    private weatherService: WeatherService;

    constructor() {
        this.weatherService = new WeatherService();
    }

    async handleRequest(req: Request, res: Response): Promise<void> {
        try {
            const request = req.body;
            const method = request.method;
            const requestId = request.id;

            if (requestId === undefined) {
                res.status(200).end();
                return;
            }

            if (method === 'initialize') {
                res.json({
                    jsonrpc: "2.0",
                    id: requestId,
                    result: {
                        protocolVersion: "2024-11-05",
                        capabilities: { tools: {} },
                        serverInfo: {
                            name: "weather-server",
                            version: "1.0.0"
                        }
                    }
                });
                return;
            }

            if (method === 'tools/list') {
                res.json({
                    jsonrpc: "2.0",
                    id: requestId,
                    result: { tools: WEATHER_TOOLS }
                });
                return;
            }

            if (method === 'tools/call') {
                await this.handleToolCall(requestId, request.params || {}, res);
                return;
            }

            res.json({
                jsonrpc: "2.0",
                id: requestId,
                error: { code: -32601, message: "Method not found" }
            });
        } catch (error) {
            res.status(500).json({
                jsonrpc: "2.0",
                id: req.body.id,
                error: { code: -32603, message: `Internal error: ${error}` }
            });
        }
    }

    private async handleToolCall(requestId: any, params: any, res: Response): Promise<void> {
        const toolName = params.name;
        const args = params.arguments || {};

        try {
            let result: any;

            if (toolName === 'get_weather') {
                const weather = await this.weatherService.getCurrentWeather(args.city);
                if (!weather) {
                    throw new Error(`Could not fetch weather data for ${args.city || 'default location'}`);
                }
                result = JSON.stringify(weather);
            } else if (toolName === 'get_forecast') {
                const forecast = await this.weatherService.getWeatherForecast(args.city, args.days);
                if (!forecast) {
                    throw new Error(`Could not fetch forecast data for ${args.city || 'default location'}`);
                }
                result = JSON.stringify(forecast);
            } else if (toolName === 'get_local_weather') {
                const weather = await this.weatherService.getLocalWeather();
                if (!weather) {
                    throw new Error('Could not fetch weather data for default location');
                }
                result = JSON.stringify(weather);
            } else {
                throw new Error(`Unknown tool: ${toolName}`);
            }

            res.json({
                jsonrpc: "2.0",
                id: requestId,
                result: {
                    content: [{ type: "text", text: result }]
                }
            });
        } catch (error) {
            res.json({
                jsonrpc: "2.0",
                id: requestId,
                error: {
                    code: -32603,
                    message: `Tool execution failed: ${error}`
                }
            });
        }
    }
}
