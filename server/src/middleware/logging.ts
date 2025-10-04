import { Request, Response, NextFunction } from 'express';

interface LogEntry {
    timestamp: string;
    method: string;
    url: string;
    ip: string;
    userAgent: string;
    statusCode: number;
    responseTime: number;
    error?: string;
}
const logs: LogEntry[] = [];
const MAX_LOGS = 1000;

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const originalSend = res.send;

    res.send = function (data) {
        const responseTime = Date.now() - start;

        const logEntry: LogEntry = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            ip: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            statusCode: res.statusCode,
            responseTime
        };

        // Add error info if status code indicates error
        if (res.statusCode >= 400) {
            logEntry.error = data?.toString() || 'Unknown error';
        }

        logs.push(logEntry);

        if (logs.length > MAX_LOGS) {
            logs.splice(0, logs.length - MAX_LOGS);
        }

        if (process.env.NODE_ENV === 'development') {
            console.log(`[${logEntry.timestamp}] ${logEntry.method} ${logEntry.url} - ${logEntry.statusCode} (${logEntry.responseTime}ms)`);
        }

        return originalSend.call(this, data);
    };

    next();
};

export const getLogs = (limit: number = 100): LogEntry[] => {
    return logs.slice(-limit);
};

export const clearLogs = (): void => {
    logs.length = 0;
};
