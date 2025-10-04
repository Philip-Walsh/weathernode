export const WEATHER_TOOLS = [
    {
        name: "get_weather",
        description: "Get current weather for a city",
        inputSchema: {
            type: "object",
            properties: {
                city: {
                    type: "string",
                    description: "City name (optional - uses DEFAULT_LOCATION if not provided)"
                }
            }
        }
    },
    {
        name: "get_forecast",
        description: "Get weather forecast for a city",
        inputSchema: {
            type: "object",
            properties: {
                city: {
                    type: "string",
                    description: "City name (optional - uses DEFAULT_LOCATION if not provided)"
                },
                days: {
                    type: "integer",
                    description: "Number of days (1-10)",
                    default: 3
                }
            }
        }
    },
    {
        name: "get_local_weather",
        description: "Get current weather for your default location",
        inputSchema: {
            type: "object",
            properties: {}
        }
    }
];
