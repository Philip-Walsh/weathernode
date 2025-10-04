export interface WeatherData {
    city: string;
    country: string;
    temperature: number;
    temperature_unit: string;
    feels_like: number;
    description: string;
    humidity: number;
    pressure: number;
    wind_speed: number;
}

export interface WeatherForecastDay {
    date: string;
    min_temp: number;
    max_temp: number;
    description: string;
}

export interface WeatherForecast {
    city: string;
    country: string;
    temperature_unit: string;
    days_requested: number;
    forecast: WeatherForecastDay[];
}

export interface WeatherAPIResponse {
    location: {
        name: string;
        country: string;
    };
    current: {
        temp_c: number;
        temp_f: number;
        feelslike_c: number;
        feelslike_f: number;
        condition: {
            text: string;
        };
        humidity: number;
        pressure_mb: number;
        wind_kph: number;
    };
}

export interface WeatherAPIForecastResponse {
    location: {
        name: string;
        country: string;
    };
    forecast: {
        forecastday: Array<{
            date: string;
            day: {
                mintemp_c: number;
                maxtemp_c: number;
                mintemp_f: number;
                maxtemp_f: number;
                condition: {
                    text: string;
                };
            };
        }>;
    };
}
