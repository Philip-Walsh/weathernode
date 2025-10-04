import { Router, Request, Response } from 'express';
import { WeatherService } from '../services/index.js';

const router = Router();
const weatherService = new WeatherService();

export { weatherService };
router.get('/weather', async (req: Request, res: Response) => {
    try {
        const { city } = req.query;
        const weather = await weatherService.getCurrentWeather(city as string);

        if (!weather) {
            return res.status(404).json({
                error: `Could not fetch weather data for ${city || 'default location'}`
            });
        }

        res.json(weather);
    } catch (error) {
        res.status(500).json({
            error: `Failed to fetch weather: ${error}`
        });
    }
});

// GET /api/forecast?city=London&days=3
router.get('/forecast', async (req: Request, res: Response) => {
    try {
        const { city, days } = req.query;
        const daysNum = days ? parseInt(days as string, 10) : 3;

        const forecast = await weatherService.getWeatherForecast(
            city as string,
            daysNum
        );

        if (!forecast) {
            return res.status(404).json({
                error: `Could not fetch forecast data for ${city || 'default location'}`
            });
        }

        res.json(forecast);
    } catch (error) {
        res.status(500).json({
            error: `Failed to fetch forecast: ${error}`
        });
    }
});

// GET /api/local
router.get('/local', async (req: Request, res: Response) => {
    try {
        const weather = await weatherService.getLocalWeather();

        if (!weather) {
            return res.status(404).json({
                error: 'Could not fetch weather data for default location'
            });
        }

        res.json(weather);
    } catch (error) {
        res.status(500).json({
            error: `Failed to fetch local weather: ${error}`
        });
    }
});

router.get('/health', (req: Request, res: Response) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'weathernode',
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
    };

    res.json(health);
});

router.get('/health/detailed', (req: Request, res: Response) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'weathernode',
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        features: {
            weatherAPI: !!process.env.WEATHER_API_KEY,
            defaultLocation: process.env.DEFAULT_LOCATION || 'London',
            temperatureUnit: process.env.TEMP_UNIT || 'C'
        },
        endpoints: {
            rest: '/api',
            mcp: '/mcp',
            health: '/api/health'
        }
    };

    res.json(health);
});

export default router;
