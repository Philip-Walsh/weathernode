import { WeatherService } from '../weather';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WeatherService', () => {
    let weatherService: WeatherService;

    beforeEach(() => {
        // Reset environment variables
        process.env.WEATHER_API_KEY = 'test-api-key';
        process.env.DEFAULT_LOCATION = 'London';
        process.env.TEMP_UNIT = 'C';

        weatherService = new WeatherService();
        jest.clearAllMocks();
    });

    describe('getCurrentWeather', () => {
        it('should fetch current weather successfully', async () => {
            const mockResponse = {
                data: {
                    location: {
                        name: 'London',
                        country: 'UK'
                    },
                    current: {
                        temp_c: 15,
                        temp_f: 59,
                        feelslike_c: 14,
                        feelslike_f: 57,
                        condition: {
                            text: 'Partly cloudy'
                        },
                        humidity: 65,
                        pressure_mb: 1013,
                        wind_kph: 10
                    }
                }
            };

            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await weatherService.getCurrentWeather('London');

            expect(result).toEqual({
                city: 'London',
                country: 'UK',
                temperature: 15,
                temperature_unit: 'C',
                feels_like: 14,
                description: 'Partly cloudy',
                humidity: 65,
                pressure: 1013,
                wind_speed: 10
            });

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'http://api.weatherapi.com/v1/current.json',
                {
                    params: {
                        key: 'test-api-key',
                        q: 'London',
                        aqi: 'no'
                    }
                }
            );
        });

        it('should use default location when no city provided', async () => {
            const mockResponse = {
                data: {
                    location: { name: 'London', country: 'UK' },
                    current: {
                        temp_c: 15, temp_f: 59, feelslike_c: 14, feelslike_f: 57,
                        condition: { text: 'Sunny' }, humidity: 60, pressure_mb: 1015, wind_kph: 8
                    }
                }
            };

            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            await weatherService.getCurrentWeather();

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'http://api.weatherapi.com/v1/current.json',
                {
                    params: {
                        key: 'test-api-key',
                        q: 'London',
                        aqi: 'no'
                    }
                }
            );
        });

        it('should handle API errors gracefully', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

            const result = await weatherService.getCurrentWeather('London');

            expect(result).toBeNull();
        });

        it('should throw error when API key is missing', async () => {
            process.env.WEATHER_API_KEY = '';

            const weatherServiceWithoutKey = new WeatherService();

            await expect(weatherServiceWithoutKey.getCurrentWeather('London'))
                .rejects.toThrow('WEATHER_API_KEY environment variable not set');
        });
    });

    describe('getWeatherForecast', () => {
        it('should fetch weather forecast successfully', async () => {
            const mockResponse = {
                data: {
                    location: {
                        name: 'London',
                        country: 'UK'
                    },
                    forecast: {
                        forecastday: [
                            {
                                date: '2024-01-01',
                                day: {
                                    mintemp_c: 10,
                                    maxtemp_c: 18,
                                    mintemp_f: 50,
                                    maxtemp_f: 64,
                                    condition: { text: 'Sunny' }
                                }
                            },
                            {
                                date: '2024-01-02',
                                day: {
                                    mintemp_c: 12,
                                    maxtemp_c: 20,
                                    mintemp_f: 54,
                                    maxtemp_f: 68,
                                    condition: { text: 'Cloudy' }
                                }
                            }
                        ]
                    }
                }
            };

            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await weatherService.getWeatherForecast('London', 2);

            expect(result).toEqual({
                city: 'London',
                country: 'UK',
                temperature_unit: 'C',
                days_requested: 2,
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
            });

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'http://api.weatherapi.com/v1/forecast.json',
                {
                    params: {
                        key: 'test-api-key',
                        q: 'London',
                        days: 2,
                        aqi: 'no',
                        alerts: 'no'
                    }
                }
            );
        });

        it('should limit days to maximum of 10', async () => {
            const mockResponse = {
                data: {
                    location: { name: 'London', country: 'UK' },
                    forecast: { forecastday: [] }
                }
            };

            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            await weatherService.getWeatherForecast('London', 15);

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'http://api.weatherapi.com/v1/forecast.json',
                expect.objectContaining({
                    params: expect.objectContaining({
                        days: 10
                    })
                })
            );
        });
    });

    describe('getLocalWeather', () => {
        it('should return weather for default location', async () => {
            const mockResponse = {
                data: {
                    location: { name: 'London', country: 'UK' },
                    current: {
                        temp_c: 15, temp_f: 59, feelslike_c: 14, feelslike_f: 57,
                        condition: { text: 'Sunny' }, humidity: 60, pressure_mb: 1015, wind_kph: 8
                    }
                }
            };

            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await weatherService.getLocalWeather();

            expect(result).toBeDefined();
            expect(mockedAxios.get).toHaveBeenCalledWith(
                'http://api.weatherapi.com/v1/current.json',
                expect.objectContaining({
                    params: expect.objectContaining({
                        q: 'London'
                    })
                })
            );
        });
    });

    describe('temperature unit handling', () => {
        it('should use Fahrenheit when TEMP_UNIT is F', async () => {
            process.env.TEMP_UNIT = 'F';
            const weatherServiceF = new WeatherService();

            const mockResponse = {
                data: {
                    location: { name: 'London', country: 'UK' },
                    current: {
                        temp_c: 15, temp_f: 59, feelslike_c: 14, feelslike_f: 57,
                        condition: { text: 'Sunny' }, humidity: 60, pressure_mb: 1015, wind_kph: 8
                    }
                }
            };

            mockedAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await weatherServiceF.getCurrentWeather('London');

            expect(result?.temperature).toBe(59);
            expect(result?.feels_like).toBe(57);
            expect(result?.temperature_unit).toBe('F');
        });
    });
});
