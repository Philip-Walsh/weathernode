import request from 'supertest';
import express from 'express';
import apiRoutes from '../../src/routes/api';
import { MCPHandler } from '../../src/mcp/handler';

// Create test app without starting server
const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

const mcpHandler = new MCPHandler();
app.post('/mcp', (req, res) => {
    mcpHandler.handleRequest(req, res);
});

app.get('/', (req, res) => {
    res.json({
        service: 'weathernode',
        version: '1.0.0',
        endpoints: {
            rest: '/api',
            mcp: '/mcp',
            health: '/api/health'
        },
        documentation: {
            rest: {
                weather: 'GET /api/weather?city=London',
                forecast: 'GET /api/forecast?city=London&days=3',
                local: 'GET /api/local'
            },
            mcp: {
                description: 'POST /mcp with MCP protocol messages',
                tools: ['get_weather', 'get_forecast', 'get_local_weather']
            }
        }
    });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
});

// Mock axios to avoid real API calls
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('End-to-End Workflow Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Complete REST API workflow', () => {
        it('should handle complete weather data workflow', async () => {
            // Mock weather API responses
            const mockCurrentWeather = {
                data: {
                    location: { name: 'London', country: 'UK' },
                    current: {
                        temp_c: 15, temp_f: 59, feelslike_c: 14, feelslike_f: 57,
                        condition: { text: 'Sunny' }, humidity: 60, pressure_mb: 1015, wind_kph: 8
                    }
                }
            };

            const mockForecast = {
                data: {
                    location: { name: 'London', country: 'UK' },
                    forecast: {
                        forecastday: [
                            {
                                date: '2024-01-01',
                                day: {
                                    mintemp_c: 10, maxtemp_c: 18, mintemp_f: 50, maxtemp_f: 64,
                                    condition: { text: 'Sunny' }
                                }
                            },
                            {
                                date: '2024-01-02',
                                day: {
                                    mintemp_c: 12, maxtemp_c: 20, mintemp_f: 54, maxtemp_f: 68,
                                    condition: { text: 'Cloudy' }
                                }
                            }
                        ]
                    }
                }
            };

            // Test 1: Health check
            const healthResponse = await request(app).get('/api/health');
            expect(healthResponse.status).toBe(200);
            expect(healthResponse.body.status).toBe('healthy');

            // Test 2: Current weather
            mockedAxios.get.mockResolvedValueOnce(mockCurrentWeather);
            const weatherResponse = await request(app)
                .get('/api/weather')
                .query({ city: 'London' });

            expect(weatherResponse.status).toBe(200);
            expect(weatherResponse.body.city).toBe('London');
            expect(weatherResponse.body.temperature).toBe(15);

            // Test 3: Weather forecast
            mockedAxios.get.mockResolvedValueOnce(mockForecast);
            const forecastResponse = await request(app)
                .get('/api/forecast')
                .query({ city: 'London', days: '2' });

            expect(forecastResponse.status).toBe(200);
            expect(forecastResponse.body.city).toBe('London');
            expect(forecastResponse.body.forecast).toHaveLength(2);

            // Test 4: Local weather (uses default location)
            mockedAxios.get.mockResolvedValueOnce(mockCurrentWeather);
            const localResponse = await request(app).get('/api/local');

            expect(localResponse.status).toBe(200);
            expect(localResponse.body.city).toBe('London');
        });
    });

    describe('Complete MCP workflow', () => {
        it('should handle complete MCP protocol workflow', async () => {
            const mockWeatherResponse = {
                data: {
                    location: { name: 'London', country: 'UK' },
                    current: {
                        temp_c: 15, temp_f: 59, feelslike_c: 14, feelslike_f: 57,
                        condition: { text: 'Sunny' }, humidity: 60, pressure_mb: 1015, wind_kph: 8
                    }
                }
            };

            // Step 1: Initialize MCP connection
            const initResponse = await request(app)
                .post('/mcp')
                .send({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'initialize',
                    params: {}
                });

            expect(initResponse.status).toBe(200);
            expect(initResponse.body.result.protocolVersion).toBe('2024-11-05');

            // Step 2: List available tools
            const toolsResponse = await request(app)
                .post('/mcp')
                .send({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'tools/list',
                    params: {}
                });

            expect(toolsResponse.status).toBe(200);
            expect(toolsResponse.body.result.tools).toHaveLength(3);

            // Step 3: Call weather tool
            mockedAxios.get.mockResolvedValueOnce(mockWeatherResponse);
            const weatherCallResponse = await request(app)
                .post('/mcp')
                .send({
                    jsonrpc: '2.0',
                    id: 3,
                    method: 'tools/call',
                    params: {
                        name: 'get_weather',
                        arguments: { city: 'London' }
                    }
                });

            expect(weatherCallResponse.status).toBe(200);
            expect(weatherCallResponse.body.result.content[0].text).toContain('London');
            expect(weatherCallResponse.body.result.content[0].text).toContain('15');
        });

        it('should handle MCP error workflow', async () => {
            // Test error handling in MCP workflow
            mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

            const errorResponse = await request(app)
                .post('/mcp')
                .send({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'tools/call',
                    params: {
                        name: 'get_weather',
                        arguments: { city: 'InvalidCity' }
                    }
                });

            expect(errorResponse.status).toBe(200);
            expect(errorResponse.body.error).toBeDefined();
            expect(errorResponse.body.error.code).toBe(-32603);
        });
    });

    describe('Cross-protocol consistency', () => {
        it('should return consistent data between REST and MCP', async () => {
            const mockWeatherResponse = {
                data: {
                    location: { name: 'London', country: 'UK' },
                    current: {
                        temp_c: 15, temp_f: 59, feelslike_c: 14, feelslike_f: 57,
                        condition: { text: 'Sunny' }, humidity: 60, pressure_mb: 1015, wind_kph: 8
                    }
                }
            };

            // Mock the same response for both calls
            mockedAxios.get
                .mockResolvedValueOnce(mockWeatherResponse)
                .mockResolvedValueOnce(mockWeatherResponse);

            // Get weather via REST API
            const restResponse = await request(app)
                .get('/api/weather')
                .query({ city: 'London' });

            // Get weather via MCP
            const mcpResponse = await request(app)
                .post('/mcp')
                .send({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'tools/call',
                    params: {
                        name: 'get_weather',
                        arguments: { city: 'London' }
                    }
                });

            expect(restResponse.status).toBe(200);
            expect(mcpResponse.status).toBe(200);

            // Parse MCP response
            const mcpWeatherData = JSON.parse(mcpResponse.body.result.content[0].text);

            // Compare key fields
            expect(restResponse.body.city).toBe(mcpWeatherData.city);
            expect(restResponse.body.temperature).toBe(mcpWeatherData.temperature);
            expect(restResponse.body.description).toBe(mcpWeatherData.description);
        });
    });

    describe('Service resilience', () => {
        it('should handle service restart simulation', async () => {
            // Test that service can handle multiple requests after "restart"
            const requests = Array(5).fill(null).map((_, i) =>
                request(app)
                    .post('/mcp')
                    .send({
                        jsonrpc: '2.0',
                        id: i + 1,
                        method: 'initialize',
                        params: {}
                    })
            );

            const responses = await Promise.all(requests);

            // All requests should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.result.protocolVersion).toBe('2024-11-05');
            });
        });

        it('should handle concurrent requests', async () => {
            const mockWeatherResponse = {
                data: {
                    location: { name: 'London', country: 'UK' },
                    current: {
                        temp_c: 15, temp_f: 59, feelslike_c: 14, feelslike_f: 57,
                        condition: { text: 'Sunny' }, humidity: 60, pressure_mb: 1015, wind_kph: 8
                    }
                }
            };

            // Mock multiple responses
            mockedAxios.get.mockResolvedValue(mockWeatherResponse);

            // Make concurrent requests
            const requests = Array(10).fill(null).map((_, i) =>
                request(app)
                    .get('/api/weather')
                    .query({ city: `City${i}` })
            );

            const responses = await Promise.all(requests);

            // Most requests should succeed (some might be rate limited)
            const successfulResponses = responses.filter(r => r.status === 200);
            expect(successfulResponses.length).toBeGreaterThan(5);
        });
    });
});
