# API Documentation

## REST API Endpoints

### Current Weather

```http
GET /api/weather?city={location}
```

**Parameters:**

- `city` (optional): Location query (city name, coordinates, ZIP code, etc.)

**Response:**

```json
{
  "city": "London",
  "country": "United Kingdom",
  "temperature": 15,
  "temperature_unit": "C",
  "feels_like": 13,
  "description": "Partly cloudy",
  "humidity": 65,
  "pressure": 1013,
  "wind_speed": 12
}
```

### Weather Forecast

```http
GET /api/forecast?city={location}&days={number}
```

**Parameters:**

- `city` (optional): Location query
- `days` (optional): Number of days (1-14, default: 3)

**Response:**

```json
{
  "city": "London",
  "country": "United Kingdom",
  "temperature_unit": "C",
  "days_requested": 3,
  "forecast": [
    {
      "date": "2025-10-04",
      "min_temp": 12,
      "max_temp": 18,
      "description": "Sunny"
    }
  ]
}
```

### Local Weather

```http
GET /api/local
```

Returns weather for the default location configured in `DEFAULT_LOCATION`.

### Health Check

```http
GET /api/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-10-04T00:00:00.000Z",
  "service": "weathernode",
  "version": "1.0.0",
  "uptime": 123.456,
  "memory": {
    "rss": 12345678,
    "heapTotal": 1234567,
    "heapUsed": 123456
  },
  "environment": "production"
}
```

## MCP Protocol

### Endpoint

```http
POST /mcp
Content-Type: application/json
```

### Available Tools

#### get_weather

Get current weather for a specific city.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {
      "city": "London"
    }
  }
}
```

#### get_forecast

Get weather forecast for a specific city.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_forecast",
    "arguments": {
      "city": "London",
      "days": 5
    }
  }
}
```

#### get_local_weather

Get current weather for the default location.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_local_weather",
    "arguments": {}
  }
}
```

## Supported Query Formats

Based on [WeatherAPI.com](https://www.weatherapi.com/docs/), the service supports:

- **City names**: `London`, `New York`, `Tokyo`
- **Coordinates**: `48.8567,2.3508` (latitude, longitude)
- **US ZIP codes**: `10001`, `90210`
- **UK postcodes**: `SW1`, `M1 1AA`
- **Airport codes**: `LHR`, `JFK` (via IATA)
- **IP addresses**: `auto:ip` for IP lookup

## Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid request",
  "message": "Missing required parameter: city"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

### 429 Too Many Requests

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests, please try again later"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "Something went wrong"
}
```
