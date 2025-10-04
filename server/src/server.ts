import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { apiRoutes, monitoringRoutes } from './routes/index.js';
import { WeatherMCPHTTPAdapter } from './mcp/index.js';
import {
    sanitizeInput,
    validateWeatherQuery,
    validateMCPRequest,
    createRateLimit,
    securityHeaders,
    requestLogger
} from './middleware/index.js';
import { logger } from './lib/logger.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));
app.use(securityHeaders);
app.use(requestLogger);
app.use(sanitizeInput);

const apiRateLimit = createRateLimit(15 * 60 * 1000, 100);
const mcpRateLimit = createRateLimit(15 * 60 * 1000, 50);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRateLimit, validateWeatherQuery, apiRoutes);
app.use('/monitoring', monitoringRoutes);

const mcpAdapter = new WeatherMCPHTTPAdapter();
app.post('/mcp', mcpRateLimit, validateMCPRequest, (req, res) => {
    mcpAdapter.handleRequest(req, res);
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

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        requestId: req.id
    });
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

app.use('*', (req: express.Request, res: express.Response) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
});

app.listen(port, () => {
    logger.info('Weathernode Server started', {
        port,
        endpoints: {
            rest: `http://localhost:${port}/api`,
            mcp: `http://localhost:${port}/mcp`,
            health: `http://localhost:${port}/api/health`
        }
    });
});

export default app;
