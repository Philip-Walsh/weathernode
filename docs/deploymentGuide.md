# Deployment Guide

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn
- [WeatherAPI.com](./weather-api.md) API key

### Setup

```bash
# Clone repository
git clone https://github.com/Philip-Walsh/weathernode.git
cd weathernode

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and add your WeatherAPI.com key

# Start development server
npm run dev
```

### Development Scripts

```bash
npm run dev          # Start with hot reload
npm run build        # Build for production
npm run mcp          # Run standalone MCP server
npm test             # Run test suite
npm run lint         # Lint code
```

## Docker Deployment

### Build Image

```bash
# Build production image
docker build -t weathernode:latest .

# Build with specific tag
docker build -t weathernode:v1.0.0 .
```

### Run Container

```bash
# Run with environment variables
docker run -p 3000:3000 \
  -e WEATHER_API_KEY=your_key_here \
  -e DEFAULT_LOCATION=London \
  -e TEMP_UNIT=C \
  weathernode:latest

# Run with volume for data persistence
docker run -p 3000:3000 \
  -e WEATHER_API_KEY=your_key_here \
  -v weathernode-data:/app/data \
  weathernode:latest
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.19+)
- Helm 3.x
- kubectl configured

### Using Helm Charts

```bash
# Create secret for API key
kubectl create secret generic weather-api-key \
  --from-literal=api-key=your_weatherapi_key_here

# Install with secret
helm install weather-service ./helm/weather-service \
  --set env.WEATHER_API_KEY=your_key_here \
  --set replicaCount=3

# Upgrade existing deployment
helm upgrade weather-service ./helm/weather-service \
  --set env.WEATHER_API_KEY=new_key_here

# Uninstall
helm uninstall weather-service
```

### Production Values

Production teams typically create their own `values.yaml` files with:

- Custom image repositories
- Resource limits and requests
- Ingress configurations
- Storage classes
- Environment-specific settings

See `helm/weather-service/values.yaml` for all available options.

### Manual Kubernetes Deployment

```bash
# Create namespace
kubectl create namespace weather

# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Check deployment status
kubectl get pods -n weather
kubectl get svc -n weather
kubectl get ingress -n weather
```

## Production Considerations

### Environment Variables

```bash
# Required
WEATHER_API_KEY=your_weatherapi_key_here

# Optional
DEFAULT_LOCATION=London
TEMP_UNIT=C
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Security

- Use HTTPS in production
- Set up proper CORS origins
- Implement rate limiting
- Use secrets management for API keys
- Enable security headers

### Monitoring

- Set up health checks
- Configure logging aggregation
- Monitor API usage and limits
- Set up alerts for failures

### Scaling

- Use horizontal pod autoscaling
- Configure resource limits
- Implement caching strategies
- Monitor performance metrics

### Backup

- Backup persistent volumes
- Export configuration
- Document deployment process
- Test disaster recovery

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check logs
kubectl logs -f deployment/weather-service

# Check environment variables
kubectl describe pod weather-service-xxx

# Check resource limits
kubectl top pods
```

#### API Key Issues

```bash
# Verify secret exists
kubectl get secret weather-api-key

# Check secret contents
kubectl get secret weather-api-key -o yaml

# Test API key
curl "http://api.weatherapi.com/v1/current.json?key=YOUR_KEY&q=London"
```

#### Network Issues

```bash
# Test service connectivity
kubectl exec -it weather-service-xxx -- curl localhost:3000/api/health

# Check service endpoints
kubectl get endpoints weather-service

# Test ingress
kubectl describe ingress weather-service
```

### Debug Commands

```bash
# Get pod details
kubectl describe pod weather-service-xxx

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp

# Port forward for testing
kubectl port-forward svc/weather-service 3000:3000

# Check resource usage
kubectl top pods
kubectl top nodes
```

### Log Analysis

```bash
# View recent logs
kubectl logs weather-service-xxx --tail=100

# Follow logs
kubectl logs -f weather-service-xxx

# Get logs from all pods
kubectl logs -l app=weather-service --tail=100
```
