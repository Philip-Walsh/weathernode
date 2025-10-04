import { MCPHandler } from '../src/mcp/handler';
import { WeatherService } from '../src/services/weather';

// Mock the WeatherService
jest.mock('../src/services/weather');
const MockedWeatherService = WeatherService as jest.MockedClass<typeof WeatherService>;

describe('MCPHandler', () => {
    let mcpHandler: MCPHandler;
    let mockWeatherService: jest.Mocked<WeatherService>;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
        // Create mock instances
        mockWeatherService = {
            getCurrentWeather: jest.fn(),
            getWeatherForecast: jest.fn(),
            getLocalWeather: jest.fn()
        } as any;

        MockedWeatherService.mockImplementation(() => mockWeatherService);

        mcpHandler = new MCPHandler();

        // Mock Express request and response
        mockRequest = {
            body: {}
        };

        mockResponse = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            end: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialize', () => {
        it('should return initialization response', async () => {
            mockRequest.body = {
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {}
            };

            await mcpHandler.handleRequest(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                id: 1,
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: {
                        name: 'weathernode-service',
                        version: '1.0.0'
                    }
                }
            });
        });
    });

    describe('tools/list', () => {
        it('should return list of available tools', async () => {
            mockRequest.body = {
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/list',
                params: {}
            };

            await mcpHandler.handleRequest(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                id: 2,
                result: {
                    tools: expect.arrayContaining([
                        expect.objectContaining({ name: 'get_weather' }),
                        expect.objectContaining({ name: 'get_forecast' }),
                        expect.objectContaining({ name: 'get_local_weather' })
                    ])
                }
            });
        });
    });

    describe('tools/call - get_weather', () => {
        it('should handle get_weather tool call successfully', async () => {
            const mockWeatherData = {
                city: 'London',
                country: 'UK',
                temperature: 15,
                temperature_unit: 'C',
                feels_like: 14,
                description: 'Sunny',
                humidity: 60,
                pressure: 1015,
                wind_speed: 8
            };

            mockWeatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);

            mockRequest.body = {
                jsonrpc: '2.0',
                id: 3,
                method: 'tools/call',
                params: {
                    name: 'get_weather',
                    arguments: { city: 'London' }
                }
            };

            await mcpHandler.handleRequest(mockRequest, mockResponse);

            expect(mockWeatherService.getCurrentWeather).toHaveBeenCalledWith('London');
            expect(mockResponse.json).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                id: 3,
                result: {
                    content: [{ type: 'text', text: JSON.stringify(mockWeatherData) }]
                }
            });
        });

        it('should handle get_weather tool call failure', async () => {
            mockWeatherService.getCurrentWeather.mockResolvedValue(null);

            mockRequest.body = {
                jsonrpc: '2.0',
                id: 3,
                method: 'tools/call',
                params: {
                    name: 'get_weather',
                    arguments: { city: 'InvalidCity' }
                }
            };

            await mcpHandler.handleRequest(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                id: 3,
                error: {
                    code: -32603,
                    message: 'Tool execution failed: Error: Could not fetch weather data for InvalidCity'
                }
            });
        });
    });

    describe('tools/call - get_forecast', () => {
        it('should handle get_forecast tool call successfully', async () => {
            const mockForecastData = {
                city: 'London',
                country: 'UK',
                temperature_unit: 'C',
                days_requested: 3,
                forecast: [
                    {
                        date: '2024-01-01',
                        min_temp: 10,
                        max_temp: 18,
                        description: 'Sunny'
                    }
                ]
            };

            mockWeatherService.getWeatherForecast.mockResolvedValue(mockForecastData);

            mockRequest.body = {
                jsonrpc: '2.0',
                id: 4,
                method: 'tools/call',
                params: {
                    name: 'get_forecast',
                    arguments: { city: 'London', days: 3 }
                }
            };

            await mcpHandler.handleRequest(mockRequest, mockResponse);

            expect(mockWeatherService.getWeatherForecast).toHaveBeenCalledWith('London', 3);
            expect(mockResponse.json).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                id: 4,
                result: {
                    content: [{ type: 'text', text: JSON.stringify(mockForecastData) }]
                }
            });
        });
    });

    describe('tools/call - get_local_weather', () => {
        it('should handle get_local_weather tool call successfully', async () => {
            const mockWeatherData = {
                city: 'London',
                country: 'UK',
                temperature: 15,
                temperature_unit: 'C',
                feels_like: 14,
                description: 'Sunny',
                humidity: 60,
                pressure: 1015,
                wind_speed: 8
            };

            mockWeatherService.getLocalWeather.mockResolvedValue(mockWeatherData);

            mockRequest.body = {
                jsonrpc: '2.0',
                id: 5,
                method: 'tools/call',
                params: {
                    name: 'get_local_weather',
                    arguments: {}
                }
            };

            await mcpHandler.handleRequest(mockRequest, mockResponse);

            expect(mockWeatherService.getLocalWeather).toHaveBeenCalled();
            expect(mockResponse.json).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                id: 5,
                result: {
                    content: [{ type: 'text', text: JSON.stringify(mockWeatherData) }]
                }
            });
        });
    });

    describe('error handling', () => {
        it('should handle unknown tool calls', async () => {
            mockRequest.body = {
                jsonrpc: '2.0',
                id: 6,
                method: 'tools/call',
                params: {
                    name: 'unknown_tool',
                    arguments: {}
                }
            };

            await mcpHandler.handleRequest(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                id: 6,
                error: {
                    code: -32603,
                    message: 'Tool execution failed: Error: Unknown tool: unknown_tool'
                }
            });
        });

        it('should handle method not found', async () => {
            mockRequest.body = {
                jsonrpc: '2.0',
                id: 7,
                method: 'unknown_method',
                params: {}
            };

            await mcpHandler.handleRequest(mockRequest, mockResponse);

            expect(mockResponse.json).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                id: 7,
                error: { code: -32601, message: 'Method not found' }
            });
        });

        it('should handle notifications (no response)', async () => {
            mockRequest.body = {
                jsonrpc: '2.0',
                method: 'initialize',
                params: {}
                // No id field - this is a notification
            };

            await mcpHandler.handleRequest(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.end).toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
        });
    });
});
