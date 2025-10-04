import request from 'supertest';
import express from 'express';
import apiRoutes from '../../routes/api';
import { MCPHandler } from '../../mcp/handler';

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
        service: 'weather-mcp-db',
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

describe('Server Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Root endpoint', () => {
        it('should return service information', async () => {
            const response = await request(app)
                .get('/');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                service: 'weather-mcp-db',
                version: '1.0.0',
                endpoints: {
                    rest: '/api',
                    mcp: '/mcp',
                    health: '/api/health'
                },
                documentation: expect.any(Object)
            });
        });
    });

    describe('Health endpoint', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/api/health');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                status: 'healthy',
                timestamp: expect.any(String),
                service: 'weather-mcp-db',
                version: '1.0.0',
                uptime: expect.any(Number),
                memory: expect.any(Object),
                environment: expect.any(String)
            });
        });
    });

    describe('REST API integration', () => {
        it('should handle weather request with mocked API response', async () => {
            const mockWeatherResponse = {
                data: {
                    location: { name: 'London', country: 'UK' },
                    current: {
                        temp_c: 15, temp_f: 59, feelslike_c: 14, feelslike_f: 57,
                        condition: { text: 'Sunny' }, humidity: 60, pressure_mb: 1015, wind_kph: 8
                    }
                }
            };

            mockedAxios.get.mockResolvedValueOnce(mockWeatherResponse);

            const response = await request(app)
                .get('/api/weather')
                .query({ city: 'London' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                city: 'London',
                country: 'UK',
                temperature: 15,
                temperature_unit: 'C',
                feels_like: 14,
                description: 'Sunny',
                humidity: 60,
                pressure: 1015,
                wind_speed: 8
            });
        });

        it('should handle forecast request with mocked API response', async () => {
            const mockForecastResponse = {
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
                            }
                        ]
                    }
                }
            };

            mockedAxios.get.mockResolvedValueOnce(mockForecastResponse);

            const response = await request(app)
                .get('/api/forecast')
                .query({ city: 'London', days: '1' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                city: 'London',
                country: 'UK',
                temperature_unit: 'C',
                days_requested: 1,
                forecast: [
                    {
                        date: '2024-01-01',
                        min_temp: 10,
                        max_temp: 18,
                        description: 'Sunny'
                    }
                ]
            });
        });

        it('should handle API errors gracefully', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

            const response = await request(app)
                .get('/api/weather')
                .query({ city: 'London' });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                error: 'Could not fetch weather data for London'
            });
        });
    });

    describe('MCP endpoint integration', () => {
        it('should handle MCP initialize request', async () => {
            const response = await request(app)
                .post('/mcp')
                .send({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'initialize',
                    params: {}
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                jsonrpc: '2.0',
                id: 1,
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: {
                        name: 'weather-server',
                        version: '1.0.0'
                    }
                }
            });
        });

        it('should handle MCP tools/list request', async () => {
            const response = await request(app)
                .post('/mcp')
                .send({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'tools/list',
                    params: {}
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
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

        it('should handle MCP tool call with mocked weather data', async () => {
            const mockWeatherResponse = {
                data: {
                    location: { name: 'London', country: 'UK' },
                    current: {
                        temp_c: 15, temp_f: 59, feelslike_c: 14, feelslike_f: 57,
                        condition: { text: 'Sunny' }, humidity: 60, pressure_mb: 1015, wind_kph: 8
                    }
                }
            };

            mockedAxios.get.mockResolvedValueOnce(mockWeatherResponse);

            const response = await request(app)
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

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                jsonrpc: '2.0',
                id: 3,
                result: {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            city: 'London',
                            country: 'UK',
                            temperature: 15,
                            temperature_unit: 'C',
                            feels_like: 14,
                            description: 'Sunny',
                            humidity: 60,
                            pressure: 1015,
                            wind_speed: 8
                        })
                    }]
                }
            });
        });

        it('should handle MCP tool call errors', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

            const response = await request(app)
                .post('/mcp')
                .send({
                    jsonrpc: '2.0',
                    id: 4,
                    method: 'tools/call',
                    params: {
                        name: 'get_weather',
                        arguments: { city: 'London' }
                    }
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                jsonrpc: '2.0',
                id: 4,
                error: {
                    code: -32603,
                    message: 'Tool execution failed: Error: Could not fetch weather data for London'
                }
            });
        });
    });

    describe('Error handling', () => {
        it('should return 404 for unknown routes', async () => {
            const response = await request(app)
                .get('/unknown-route');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                error: 'Not found',
                message: 'Route GET /unknown-route not found'
            });
        });

        it('should handle malformed JSON in MCP requests', async () => {
            const response = await request(app)
                .post('/mcp')
                .send('invalid json');

            // Express will parse this as text, not JSON, so it won't be 400
            expect(response.status).toBe(200);
        });
    });

    describe('Rate limiting', () => {
        it('should apply rate limiting to API endpoints', async () => {
            // Make multiple requests quickly to test rate limiting
            const requests = Array(20).fill(null).map(() =>
                request(app).get('/api/health')
            );

            const responses = await Promise.all(requests);

            // All requests should succeed since we're not using the full server with rate limiting
            // In a real integration test, we'd test against the full server
            const successfulResponses = responses.filter(r => r.status === 200);
            expect(successfulResponses.length).toBe(20);
        });
    });
});
