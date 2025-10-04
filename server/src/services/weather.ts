import axios from 'axios';
import { WeatherData, WeatherForecast, WeatherAPIResponse, WeatherAPIForecastResponse } from '../domain';
import { logger } from '../lib/logger.js';

/**
 * Weather service that provides weather data from WeatherAPI.com
 */
export class WeatherService {
    private apiKey: string;
    private defaultLocation: string;
    private tempUnit: string;
    private baseUrl = 'http://api.weatherapi.com/v1';

    constructor() {
        this.apiKey = process.env.WEATHER_API_KEY || '';
        this.defaultLocation = process.env.DEFAULT_LOCATION || 'London';
        this.tempUnit = process.env.TEMP_UNIT || 'C';
    }

    /**
     * Get current weather for a specific city
     * @param city - City name (optional, uses default if not provided)
     * @returns Weather data or null if error
     */
    async getCurrentWeather(city?: string): Promise<WeatherData | null> {
        const location = city || this.defaultLocation;

        if (!this.apiKey) {
            throw new Error('WEATHER_API_KEY environment variable not set');
        }

        try {
            const response = await axios.get<WeatherAPIResponse>(
                `${this.baseUrl}/current.json`,
                {
                    params: {
                        key: this.apiKey,
                        q: location,
                        aqi: 'no'
                    }
                }
            );

            const data = response.data;
            const isCelsius = this.tempUnit.toUpperCase() === 'C';

            return {
                city: data.location.name,
                country: data.location.country,
                temperature: isCelsius ? data.current.temp_c : data.current.temp_f,
                temperature_unit: this.tempUnit,
                feels_like: isCelsius ? data.current.feelslike_c : data.current.feelslike_f,
                description: data.current.condition.text,
                humidity: data.current.humidity,
                pressure: data.current.pressure_mb,
                wind_speed: data.current.wind_kph
            };
        } catch (error) {
            logger.error('Error fetching current weather', {
                location,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            return null;
        }
    }

    /**
     * Get weather forecast for a specific city
     * @param city - City name (optional, uses default if not provided)
     * @param days - Number of days to forecast (1-10, default: 3)
     * @returns Weather forecast or null if error
     */
    async getWeatherForecast(city?: string, days: number = 3): Promise<WeatherForecast | null> {
        const location = city || this.defaultLocation;

        if (!this.apiKey) {
            throw new Error('WEATHER_API_KEY environment variable not set');
        }

        try {
            const response = await axios.get<WeatherAPIForecastResponse>(
                `${this.baseUrl}/forecast.json`,
                {
                    params: {
                        key: this.apiKey,
                        q: location,
                        days: Math.min(days, 10),
                        aqi: 'no',
                        alerts: 'no'
                    }
                }
            );

            const data = response.data;
            const isCelsius = this.tempUnit.toUpperCase() === 'C';

            return {
                city: data.location.name,
                country: data.location.country,
                temperature_unit: this.tempUnit,
                days_requested: days,
                forecast: data.forecast.forecastday.map((day: any) => ({
                    date: day.date,
                    min_temp: isCelsius ? day.day.mintemp_c : day.day.mintemp_f,
                    max_temp: isCelsius ? day.day.maxtemp_c : day.day.maxtemp_f,
                    description: day.day.condition.text
                }))
            };
        } catch (error) {
            logger.error('Error fetching weather forecast', {
                location,
                days,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            return null;
        }
    }

    /**
     * Get current weather for the default location
     * @returns Weather data or null if error
     */
    async getLocalWeather(): Promise<WeatherData | null> {
        return this.getCurrentWeather(this.defaultLocation);
    }
}
