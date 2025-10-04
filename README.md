# Weather MCP Service

> A lite weather service providing live weather data and forecasts via both REST API and MCP (Model Context Protocol) endpoints.

A minimal, production-ready weather service designed for local deployment with dual protocol support and comprehensive monitoring. 

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

## Quick Start

```bash
# Clone & install
git clone <repo-url>
cd weather-mcp-db
npm install

# Set up environment
cp .env.example .env
# Add your WeatherAPI.com key to .env
# Get your free API key at: https://www.weatherapi.com/

# Run
npm run dev
```

**Server runs on:** `http://localhost:3000`

## API

### REST Endpoints

```bash
GET  /api/weather?city=London     # Current weather
GET  /api/forecast?city=London    # 3-day forecast
GET  /api/local                   # Default location
GET  /api/health                  # Health check
```

### MCP Protocol

```bash
POST /mcp                         # MCP JSON-RPC 2.0
```

**Available Tools:**

- `get_weather` - Current weather for a city
- `get_forecast` - Weather forecast (1-10 days)
- `get_local_weather` - Default location weather

## Usage

### REST API

```bash
# Current weather
curl "http://localhost:3000/api/weather?city=London"

# Forecast
curl "http://localhost:3000/api/forecast?city=London&days=5"
```

### MCP Protocol

```bash
# List tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Get weather
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_weather","arguments":{"city":"London"}}}'
```

## Development

```bash
npm run dev          # Development server
npm run build        # Build for production
npm run mcp          # Standalone MCP server (stdio)
npm test             # Run tests
npm run lint         # Lint code
```

## Deployment

### Docker

```bash
# Local development
docker-compose up -d

# Production
docker build -t weather-mcp-db .
docker run -p 3000:3000 -e WEATHER_API_KEY=your_key weather-mcp-db
```

### Kubernetes

```bash
# Using Helm
helm install weather-service ./helm/weather-service \
  --set env.WEATHER_API_KEY=your_key
```

## Configuration

| Variable           | Default | Description                   |
| ------------------ | ------- | ----------------------------- |
| `WEATHER_API_KEY`  | -       | WeatherAPI.com key (required) |
| `DEFAULT_LOCATION` | London  | Default city                  |
| `TEMP_UNIT`        | C       | Temperature unit              |
| `PORT`             | 3000    | Server port                   |

## Architecture

```
┌─────────────┐    ┌─────────────┐
│ REST Client │    │ MCP Client  │
└──────┬──────┘    └──────┬──────┘
       │                  │
       └──────────┬───────┘
                  │
         ┌────────▼────────┐
         │ Express Server  │
         │ /api + /mcp     │
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │ Weather Service │
         │ WeatherAPI.com  │
         └─────────────────┘
```

## Features

- ✅ **Dual Protocol** - REST + MCP in one server
- ✅ **Official MCP SDK** - `@modelcontextprotocol/sdk`
- ✅ **TypeScript** - Full type safety
- ✅ **Security** - Rate limiting, validation, headers
- ✅ **Monitoring** - Health checks, metrics, logging
- ✅ **Testing** - 68 tests (unit, integration, e2e)
- ✅ **Docker** - Multi-stage build with nginx
- ✅ **Kubernetes** - Helm charts included

## License

MIT
