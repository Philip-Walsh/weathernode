import { Router, Request, Response } from 'express';
import { getLogs, clearLogs } from '../middleware/index.js';

const router = Router();
router.get('/logs', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = getLogs(limit);

    res.json({
        logs,
        count: logs.length,
        limit
    });
});

router.delete('/logs', (req: Request, res: Response) => {
    clearLogs();
    res.json({ message: 'Logs cleared successfully' });
});

router.get('/metrics', (req: Request, res: Response) => {
    const metrics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
    };

    res.json(metrics);
});

router.get('/stats', (req: Request, res: Response) => {
    const logs = getLogs(1000); // Get last 1000 requests

    const stats = {
        timestamp: new Date().toISOString(),
        totalRequests: logs.length,
        requestsByMethod: logs.reduce((acc, log) => {
            acc[log.method] = (acc[log.method] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        requestsByStatus: logs.reduce((acc, log) => {
            const status = Math.floor(log.statusCode / 100) * 100;
            acc[`${status}xx`] = (acc[`${status}xx`] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        averageResponseTime: logs.length > 0
            ? Math.round(logs.reduce((sum, log) => sum + log.responseTime, 0) / logs.length)
            : 0,
        errorRate: logs.length > 0
            ? Math.round((logs.filter(log => log.statusCode >= 400).length / logs.length) * 100) / 100
            : 0
    };

    res.json(stats);
});

export default router;
