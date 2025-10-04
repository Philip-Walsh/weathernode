import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';


const weatherQuerySchema = Joi.object({
    city: Joi.string().min(1).max(100).optional(),
    days: Joi.number().integer().min(1).max(10).optional()
});

const mcpRequestSchema = Joi.object({
    jsonrpc: Joi.string().valid('2.0').required(),
    id: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
    method: Joi.string().required(),
    params: Joi.object().optional()
});

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    // Sanitize query parameters
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key]?.toString().trim();
            }
        });
    }

    // Sanitize body for MCP requests
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        });
    }

    next();
};

export const validateWeatherQuery = (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = weatherQuerySchema.validate(req.query);

    if (error) {
        return res.status(400).json({
            error: 'Invalid query parameters',
            details: error.details.map(d => d.message)
        });
    }

    req.query = value;
    next();
};

export const validateMCPRequest = (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = mcpRequestSchema.validate(req.body);

    if (error) {
        return res.status(400).json({
            jsonrpc: '2.0',
            id: req.body.id || null,
            error: {
                code: -32700,
                message: 'Parse error',
                data: error.details.map(d => d.message)
            }
        });
    }

    req.body = value;
    next();
};

export const createRateLimit = (windowMs: number, max: number) => {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean up old entries
        for (const [key, value] of requests.entries()) {
            if (value.resetTime < windowStart) {
                requests.delete(key);
            }
        }

        const userRequests = requests.get(ip);

        if (!userRequests) {
            requests.set(ip, { count: 1, resetTime: now });
            return next();
        }

        if (userRequests.resetTime < windowStart) {
            requests.set(ip, { count: 1, resetTime: now });
            return next();
        }

        if (userRequests.count >= max) {
            return res.status(429).json({
                error: 'Too many requests',
                message: `Rate limit exceeded. Max ${max} requests per ${windowMs / 1000} seconds`,
                retryAfter: Math.ceil((userRequests.resetTime + windowMs - now) / 1000)
            });
        }

        userRequests.count++;
        next();
    };
};

export const validateAPIKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;

    // For now, we don't require API keys, but this is intended for future use
    if (apiKey && apiKey.length < 10) {
        return res.status(401).json({
            error: 'Invalid API key',
            message: 'API key must be at least 10 characters long'
        });
    }

    next();
};

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Remove server header
    res.removeHeader('X-Powered-By');

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
};
