import request from 'supertest';
import express from 'express';

// Mock the WeatherService before importing the routes
jest.mock('../../services/weather');
import { WeatherService } from '../../services/weather';
const MockedWeatherService = WeatherService as jest.MockedClass<typeof WeatherService>;

// Import routes after mocking
import apiRoutes, { weatherService } from '../api';

describe('API Routes', () => {
    let app: express.Application;

    beforeEach(() => {
        // Create Express app with routes
        app = express();
        app.use(express.json());
        app.use('/api', apiRoutes);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/weather', () => {
        it('should return weather data successfully', async () => {
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

            (weatherService.getCurrentWeather as jest.Mock).mockResolvedValue(mockWeatherData);

            const response = await request(app)
                .get('/api/weather')
                .query({ city: 'London' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockWeatherData);
            expect(weatherService.getCurrentWeather).toHaveBeenCalledWith('London');
        });

        it('should return 404 when weather data is not found', async () => {
            (weatherService.getCurrentWeather as jest.Mock).mockResolvedValue(null);

            const response = await request(app)
                .get('/api/weather')
                .query({ city: 'InvalidCity' });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                error: 'Could not fetch weather data for InvalidCity'
            });
        });

        it('should return 500 when service throws error', async () => {
            (weatherService.getCurrentWeather as jest.Mock).mockRejectedValue(new Error('API Error'));

            const response = await request(app)
                .get('/api/weather')
                .query({ city: 'London' });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                error: 'Failed to fetch weather: Error: API Error'
            });
        });

        it('should work without city parameter (uses default)', async () => {
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

            (weatherService.getCurrentWeather as jest.Mock).mockResolvedValue(mockWeatherData);

            const response = await request(app)
                .get('/api/weather');

            expect(response.status).toBe(200);
            expect(weatherService.getCurrentWeather).toHaveBeenCalledWith(undefined);
        });
    });

    describe('GET /api/forecast', () => {
        it('should return forecast data successfully', async () => {
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
                    },
                    {
                        date: '2024-01-02',
                        min_temp: 12,
                        max_temp: 20,
                        description: 'Cloudy'
                    }
                ]
            };

            (weatherService.getWeatherForecast as jest.Mock).mockResolvedValue(mockForecastData);

            const response = await request(app)
                .get('/api/forecast')
                .query({ city: 'London', days: '3' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockForecastData);
            expect(weatherService.getWeatherForecast).toHaveBeenCalledWith('London', 3);
        });

        it('should use default days when not provided', async () => {
            const mockForecastData = {
                city: 'London',
                country: 'UK',
                temperature_unit: 'C',
                days_requested: 3,
                forecast: []
            };

            (weatherService.getWeatherForecast as jest.Mock).mockResolvedValue(mockForecastData);

            const response = await request(app)
                .get('/api/forecast')
                .query({ city: 'London' });

            expect(response.status).toBe(200);
            expect(weatherService.getWeatherForecast).toHaveBeenCalledWith('London', 3);
        });

        it('should return 404 when forecast data is not found', async () => {
            (weatherService.getWeatherForecast as jest.Mock).mockResolvedValue(null);

            const response = await request(app)
                .get('/api/forecast')
                .query({ city: 'InvalidCity' });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                error: 'Could not fetch forecast data for InvalidCity'
            });
        });
    });

    describe('GET /api/local', () => {
        it('should return local weather data successfully', async () => {
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

            (weatherService.getLocalWeather as jest.Mock).mockResolvedValue(mockWeatherData);

            const response = await request(app)
                .get('/api/local');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockWeatherData);
            expect(weatherService.getLocalWeather).toHaveBeenCalled();
        });

        it('should return 404 when local weather data is not found', async () => {
            (weatherService.getLocalWeather as jest.Mock).mockResolvedValue(null);

            const response = await request(app)
                .get('/api/local');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                error: 'Could not fetch weather data for default location'
            });
        });
    });

    describe('GET /api/health', () => {
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
});
