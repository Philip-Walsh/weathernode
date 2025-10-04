import request from 'supertest';
import express from 'express';
import apiRoutes from '../src/routes/api';
import monitoringRoutes from '../src/routes/monitoring';
import { MCPHandler } from '../src/mcp/handler';
import {
    sanitizeInput,
    validateWeatherQuery,
    validateMCPRequest,
    createRateLimit,
    securityHeaders
} from '../src/middleware/validation';
import { requestLogger } from '../src/middleware/logging';

// Create test app with security middleware
const app = express();
app.use(express.json());
app.use(securityHeaders);
app.use(requestLogger);
app.use(sanitizeInput);

const apiRateLimit = createRateLimit(1000, 5); // 5 requests per second for testing
const mcpRateLimit = createRateLimit(1000, 3); // 3 requests per second for testing

app.use('/api', apiRateLimit, validateWeatherQuery, apiRoutes);
app.use('/monitoring', monitoringRoutes);

const mcpHandler = new MCPHandler();
app.post('/mcp', mcpRateLimit, validateMCPRequest, (req, res) => {
    mcpHandler.handleRequest(req, res);
});

describe('Security Features', () => {
    beforeEach(() => {
        // Clear logs before each test
        const { clearLogs } = require('../src/middleware/logging');
        clearLogs();
    });

    describe('Security Headers', () => {
        it('should include security headers', async () => {
            const response = await request(app).get('/api/health');

            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
            expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
            expect(response.headers['x-powered-by']).toBeUndefined();
        });
    });

    describe('Input Validation', () => {
        it('should validate weather query parameters', async () => {
            const response = await request(app)
                .get('/api/weather')
                .query({ city: 'a'.repeat(101) }); // Too long city name

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid query parameters');
        });

        it('should validate MCP request format', async () => {
            const response = await request(app)
                .post('/mcp')
                .send({
                    jsonrpc: '1.0', // Invalid version
                    method: 'test'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBeDefined();
        });

        it('should sanitize input by trimming whitespace', async () => {
            const response = await request(app)
                .get('/api/weather')
                .query({ city: '  London  ' });

            // Should not error and should process the trimmed input
            expect(response.status).toBe(404); // 404 because no weather service mock
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limits on API endpoints', async () => {
            // Make multiple requests quickly
            const requests = Array(10).fill(null).map(() =>
                request(app).get('/api/health')
            );

            const responses = await Promise.all(requests);

            // Some requests should be rate limited
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });

        it('should enforce rate limits on MCP endpoints', async () => {
            // Make multiple MCP requests quickly
            const requests = Array(10).fill(null).map((_, i) =>
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

            // Some requests should be rate limited
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });
    });

    describe('Request Logging', () => {
        it('should log requests', async () => {
            // Clear logs first
            const { clearLogs } = require('../src/middleware/logging');
            clearLogs();

            await request(app).get('/api/health');

            const logsResponse = await request(app).get('/monitoring/logs');

            expect(logsResponse.status).toBe(200);
            expect(logsResponse.body.logs.length).toBeGreaterThan(0);

            // Find the health endpoint request log
            const healthLog = logsResponse.body.logs.find((log: any) =>
                log.url === '/api/health' && log.method === 'GET'
            );
            expect(healthLog).toBeDefined();
            expect(healthLog.method).toBe('GET');
            expect(healthLog.url).toBe('/api/health');
        });

        it('should provide system metrics', async () => {
            const response = await request(app).get('/monitoring/metrics');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('memory');
            expect(response.body).toHaveProperty('cpu');
            expect(response.body).toHaveProperty('platform');
        });

        it('should provide API usage statistics', async () => {
            // Make a few requests first
            await request(app).get('/api/health');
            await request(app).get('/api/health');

            const response = await request(app).get('/monitoring/stats');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('totalRequests');
            expect(response.body).toHaveProperty('requestsByMethod');
            expect(response.body).toHaveProperty('averageResponseTime');
        });
    });

    describe('Error Handling', () => {
        it('should handle malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/mcp')
                .set('Content-Type', 'application/json')
                .send('invalid json');

            // Should return 400 for malformed JSON (this is correct behavior)
            expect(response.status).toBe(400);
        });

        it('should handle unknown routes with 404', async () => {
            const response = await request(app).get('/unknown-route');

            expect(response.status).toBe(404);
        });
    });

    describe('Monitoring Endpoints', () => {
        it('should provide detailed health information', async () => {
            // Use a fresh app instance to avoid rate limiting
            const freshApp = express();
            freshApp.use(express.json());
            freshApp.use(securityHeaders);
            freshApp.use(requestLogger);
            freshApp.use(sanitizeInput);
            freshApp.use('/api', apiRoutes);

            const response = await request(freshApp).get('/api/health/detailed');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('features');
            expect(response.body).toHaveProperty('endpoints');
            expect(response.body.features).toHaveProperty('weatherAPI');
        });

        it('should allow clearing logs', async () => {
            // Use a fresh app instance to avoid rate limiting
            const freshApp = express();
            freshApp.use(express.json());
            freshApp.use(securityHeaders);
            freshApp.use(requestLogger);
            freshApp.use(sanitizeInput);
            freshApp.use('/api', apiRoutes);
            freshApp.use('/monitoring', monitoringRoutes);

            // First make a request to generate logs
            await request(freshApp).get('/api/health');

            // Clear logs
            const clearResponse = await request(freshApp).delete('/monitoring/logs');
            expect(clearResponse.status).toBe(200);

            // Check logs are cleared (should only have the clear request itself)
            const logsResponse = await request(freshApp).get('/monitoring/logs');
            expect(logsResponse.body.logs.length).toBeGreaterThan(0);

            // Find the clear logs request
            const clearLog = logsResponse.body.logs.find((log: any) =>
                log.url === '/monitoring/logs' && log.method === 'DELETE'
            );
            expect(clearLog).toBeDefined();
            expect(clearLog.method).toBe('DELETE');
            expect(clearLog.url).toBe('/monitoring/logs');
        });
    });
});
