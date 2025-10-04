import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { logger } from '../lib/logger.js';
import { ringBufferTransport } from '../lib/ringBufferTransport.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Generate or use existing request ID
    const requestId = req.headers['x-request-id']?.toString() || uuid();
    req.id = requestId;
    res.locals.requestId = requestId;

    // Create child logger with request ID
    const requestLogger = logger.child({ requestId });

    // Log request start
    requestLogger.info('request start', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
    });

    const originalSend = res.send;

    res.send = function (data) {
        const responseTime = Date.now() - start;

        // Log request completion
        requestLogger.info('request end', {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime
        });

        // Add error info if status code indicates error
        if (res.statusCode >= 400) {
            requestLogger.warn('request error', {
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                responseTime,
                error: data?.toString() || 'Unknown error'
            });
        }

        return originalSend.call(this, data);
    };

    next();
};

export const getLogs = (limit: number = 100) => {
    return ringBufferTransport.getLogs(limit);
};

export const clearLogs = (): void => {
    ringBufferTransport.clearLogs();
};
