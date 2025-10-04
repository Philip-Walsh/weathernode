# Weathernode

A production-ready weather service providing live weather data via REST API and MCP (Model Context Protocol) endpoints.

## Features

- **Dual Protocol Support**: REST API and MCP endpoints
- **Weather Data**: Current weather and forecasts using WeatherAPI.com
- **Production Ready**: Docker, Kubernetes, Helm charts
- **Security**: Rate limiting, input validation, CORS
- **Monitoring**: Health checks and metrics
- **TypeScript**: Full type safety and modern development

## Quick Start

### Prerequisites

- Node.js 18+
- [WeatherAPI.com](https://www.weatherapi.com/) API key (free tier: 1M calls/month)

### Installation

```bash
# Clone repository
git clone https://github.com/Philip-Walsh/weathernode.git
cd weathernode

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your WeatherAPI.com key to .env

# Start development server
npm run dev
```

Server runs on: `http://localhost:3000`

## API Endpoints

### REST API

```bash
# Current weather
GET /api/weather?city=London

# Weather forecast
GET /api/forecast?city=London&days=5

# Default location weather
GET /api/local

# Health check
GET /api/health
```

### MCP Protocol

```bash
# List available tools
POST /mcp
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}

# Get weather data
POST /mcp
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {"city": "London"}
  }
}
```

## Development

```bash
npm run dev          # Development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm test             # Run test suite
npm run lint         # Lint code
```

## Deployment

### Docker

```bash
# Build image
docker build -t weathernode .

# Run container
docker run -p 3000:3000 \
  -e WEATHER_API_KEY=your_key_here \
  weathernode
```

### Kubernetes

```bash
# Create secret
kubectl create secret generic weather-api-key \
  --from-literal=api-key=your_weatherapi_key_here

# Deploy with Helm
helm install weather-service ./helm/weather-service \
  --set env.WEATHER_API_KEY=your_key_here
```

## Documentation

- [API Reference](docs/api-reference.md) - Complete API documentation
- [Deployment Guide](docs/deployment-guide.md) - Production deployment
- [WeatherAPI Setup](docs/weather-api-setup.md) - Weather data source setup

## Environment Variables

```bash
WEATHER_API_KEY=your_weatherapi_key_here  # Required
DEFAULT_LOCATION=London                   # Optional
TEMP_UNIT=C                              # Optional
PORT=3000                                # Optional
NODE_ENV=development                     # Optional
```

## License

MIT
