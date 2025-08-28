# Docker Documentation

## 🐳 Overview

Strezz provides Dockerized runners for easy deployment and execution of performance tests. The Docker setup includes multiple stages for different backends (k6, Locust, and multi-backend) with proper security practices and health checks.

## 🚀 Quick Start

### **1. Build Docker Images**

```bash
# Build all images
./scripts/docker-build.sh

# Build specific backend
docker build --target k6-runner -t strezz:k6 .
docker build --target locust-runner -t strezz:locust .
docker build --target multi-runner -t strezz:multi .
```

### **2. Run Performance Tests**

```bash
# Generate k6 test
./scripts/docker-run.sh generate --backend k6 --config examples/laravel-ecommerce.json

# Run k6 test
./scripts/docker-run.sh run --backend k6 --config examples/laravel-ecommerce.json

# Open shell in container
./scripts/docker-run.sh shell --backend multi
```

### **3. Use Docker Compose**

```bash
# Start k6 runner
docker-compose --profile k6 up

# Start monitoring stack
docker-compose --profile monitoring up

# Run examples
docker-compose --profile examples up
```

## 🏗️ Docker Architecture

### **Multi-Stage Build**

The Dockerfile uses a multi-stage approach for optimal image sizes:

```
Builder Stage (node:22-alpine)
    ↓
Runtime Stages:
├── k6-runner (grafana/k6:latest)
├── locust-runner (locustio/locust:latest)
└── multi-runner (grafana/k6:latest + Python)
```

### **Stage Details**

#### **Stage 1: Builder**
- **Base**: `node:22-alpine`
- **Purpose**: Build the Node.js application
- **Output**: Built application in `/app/dist`

#### **Stage 2: k6 Runner**
- **Base**: `grafana/k6:latest`
- **Features**: k6 + Node.js + Strezz CLI
- **Use Case**: k6-only performance testing

#### **Stage 3: Locust Runner**
- **Base**: `locustio/locust:latest`
- **Features**: Locust + Node.js + Strezz CLI
- **Use Case**: Locust-only performance testing

#### **Stage 4: Multi Runner**
- **Base**: `grafana/k6:latest`
- **Features**: k6 + Locust + Node.js + Strezz CLI
- **Use Case**: Full-stack performance testing

## 🔧 Image Features

### **Security Features**
- **Non-root User**: All containers run as `strezz` user (UID 1001)
- **Minimal Base Images**: Alpine-based images where possible
- **Health Checks**: Built-in health monitoring
- **Read-only Volumes**: Example configurations mounted read-only

### **Performance Features**
- **Multi-stage Builds**: Optimized image sizes
- **Layer Caching**: Efficient dependency installation
- **Volume Mounts**: Persistent output storage
- **Resource Limits**: Configurable via Docker Compose

### **Development Features**
- **Hot Reload**: Mount source code for development
- **Debug Support**: Interactive shell access
- **Logging**: Structured output and error handling
- **Environment Variables**: Configurable via `.env` files

## 📦 Available Images

### **Image Tags**

| Tag | Description | Size | Use Case |
|-----|-------------|------|----------|
| `strezz:k6` | k6 backend only | ~150MB | k6 performance testing |
| `strezz:locust` | Locust backend only | ~200MB | Locust performance testing |
| `strezz:multi` | Both backends | ~250MB | Full-stack testing |
| `strezz:latest` | Latest multi-backend | ~250MB | Production use |

### **Image Contents**

#### **k6 Runner**
```
/app/
├── dist/           # Built Strezz application
├── examples/       # Example configurations
├── scripts/        # Utility scripts
├── package.json    # Dependencies
└── node_modules/   # Node.js packages
```

#### **Locust Runner**
```
/app/
├── dist/           # Built Strezz application
├── examples/       # Example configurations
├── scripts/        # Utility scripts
├── package.json    # Dependencies
└── node_modules/   # Node.js packages
```

#### **Multi Runner**
```
/app/
├── dist/           # Built Strezz application
├── examples/       # Example configurations
├── scripts/        # Utility scripts
├── package.json    # Dependencies
├── node_modules/   # Node.js packages
└── Python packages # Locust and dependencies
```

## 🚀 Usage Examples

### **Basic Commands**

#### **Generate Test Files**
```bash
# Generate k6 test
docker run --rm \
  -v $(pwd)/examples:/app/examples:ro \
  -v $(pwd)/output:/app/output \
  strezz:k6 \
  node dist/strezz.js \
  --config examples/laravel-ecommerce.json \
  --backend k6 \
  --output /app/output/laravel-test.js

# Generate Locust test
docker run --rm \
  -v $(pwd)/examples:/app/examples:ro \
  -v $(pwd)/output:/app/output \
  strezz:locust \
  node dist/strezz.js \
  --config examples/yii-cms.json \
  --backend locust \
  --output /app/output/yii-test.py
```

#### **Run Performance Tests**
```bash
# Run k6 test
docker run --rm \
  -v $(pwd)/output:/app/output \
  strezz:k6 \
  k6 run \
  --out json=/app/output/results.json \
  /app/output/laravel-test.js

# Run Locust test
docker run --rm \
  -v $(pwd)/output:/app/output \
  strezz:locust \
  locust \
  -f /app/output/yii-test.py \
  --host=https://httpbin.org \
  --users 5 \
  --spawn-rate 1 \
  --run-time 30s \
  --headless
```

### **Advanced Usage**

#### **Custom Configuration**
```bash
# Use custom environment variables
docker run --rm \
  -e TARGET_URL=https://api.example.com \
  -e FRAMEWORK=laravel \
  -v $(pwd)/examples:/app/examples:ro \
  -v $(pwd)/output:/app/output \
  strezz:multi \
  node dist/strezz.js \
  --config examples/laravel-ecommerce.json \
  --backend k6
```

#### **Interactive Development**
```bash
# Open shell in container
docker run --rm -it \
  -v $(pwd)/examples:/app/examples:ro \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/src:/app/src \
  strezz:multi \
  /bin/sh

# Inside container
node dist/strezz.js --help
k6 version
locust --version
```

## 🐙 Docker Compose

### **Service Profiles**

#### **k6 Profile**
```bash
# Start k6 runner
docker-compose --profile k6 up

# Services started:
# - strezz-k6: k6 backend runner
```

#### **Locust Profile**
```bash
# Start Locust runner
docker-compose --profile locust up

# Services started:
# - strezz-locust: Locust backend runner
```

#### **Multi Profile**
```bash
# Start multi-backend runner
docker-compose --profile multi up

# Services started:
# - strezz-multi: Both k6 and Locust support
```

#### **Monitoring Profile**
```bash
# Start monitoring stack
docker-compose --profile monitoring up

# Services started:
# - influxdb: Metrics storage
# - grafana: Metrics visualization
```

#### **Examples Profile**
```bash
# Run example tests
docker-compose --profile examples up

# Services started:
# - example-k6: k6 example test
# - example-locust: Locust example test
```

### **Environment Variables**

```yaml
# .env file
NODE_ENV=production
TARGET_URL=https://api.example.com
FRAMEWORK=laravel
BACKEND=k6
```

### **Volume Mounts**

```yaml
volumes:
  - ./examples:/app/examples:ro    # Read-only configs
  - ./output:/app/output           # Test results
  - ./src:/app/src                 # Development source
```

## 🔍 Health Checks

### **Health Check Configuration**

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node --version && k6 version || exit 1
```

### **Health Check Commands**

| Service | Health Check Command |
|---------|---------------------|
| k6 Runner | `node --version && k6 version` |
| Locust Runner | `node --version && locust --version` |
| Multi Runner | `node --version && k6 version && locust --version` |
| InfluxDB | `influx ping` |
| Grafana | `curl -f http://localhost:3000/api/health` |

### **Health Check Status**

```bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Health}}"

# View health check logs
docker inspect --format='{{json .State.Health}}' container_name
```

## 📊 Monitoring Integration

### **InfluxDB Setup**

```bash
# Start InfluxDB
docker-compose --profile monitoring up influxdb

# Access InfluxDB UI
open http://localhost:8086

# Default credentials:
# Username: admin
# Password: strezz123
# Organization: strezz
# Bucket: k6
```

### **Grafana Setup**

```bash
# Start Grafana
docker-compose --profile monitoring up grafana

# Access Grafana UI
open http://localhost:3000

# Default credentials:
# Username: admin
# Password: strezz123
```

### **k6 Metrics Export**

```bash
# Export metrics to InfluxDB
docker run --rm \
  -v $(pwd)/output:/app/output \
  strezz:k6 \
  k6 run \
  --out influxdb=http://host.docker.internal:8086/k6 \
  --out json=/app/output/results.json \
  /app/output/test.js
```

## 🛠️ Development Workflow

### **Local Development**

```bash
# Build development image
docker build --target multi-runner \
  --build-arg NODE_ENV=development \
  -t strezz:dev .

# Run with source code mounted
docker run --rm -it \
  -v $(pwd)/src:/app/src \
  -v $(pwd)/examples:/app/examples:ro \
  -v $(pwd)/output:/app/output \
  strezz:dev \
  /bin/sh

# Inside container
npm run build
node dist/strezz.js --help
```

### **Testing**

```bash
# Run tests in container
docker run --rm \
  -v $(pwd):/app \
  strezz:multi \
  npm test

# Run specific test
docker run --rm \
  -v $(pwd):/app \
  strezz:multi \
  npm test -- --testNamePattern="k6"
```

### **Debugging**

```bash
# Run with debug logging
docker run --rm \
  -e DEBUG=* \
  -v $(pwd)/examples:/app/examples:ro \
  -v $(pwd)/output:/app/output \
  strezz:multi \
  node dist/strezz.js --config examples/minimal-working.json

# Attach debugger
docker run --rm -it \
  -p 9229:9229 \
  -v $(pwd)/examples:/app/examples:ro \
  strezz:multi \
  node --inspect=0.0.0.0:9229 dist/strezz.js
```

## 🔒 Security Considerations

### **Security Features**

- **Non-root User**: All containers run as `strezz` user
- **Read-only Mounts**: Example configurations mounted read-only
- **Minimal Base Images**: Reduced attack surface
- **Health Checks**: Container health monitoring
- **Resource Limits**: Configurable via Docker Compose

### **Security Best Practices**

```yaml
# docker-compose.yml
services:
  strezz-k6:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    environment:
      - NODE_ENV=production
```

### **Network Security**

```yaml
# Isolated network
networks:
  strezz-network:
    driver: bridge
    internal: true  # No external access
```

## 📈 Performance Optimization

### **Build Optimization**

```dockerfile
# Multi-stage build
FROM node:22-alpine AS builder
COPY package*.json ./
RUN npm ci --only=production

# Copy only necessary files
COPY dist/ ./dist/
COPY examples/ ./examples/
```

### **Runtime Optimization**

```yaml
# Resource limits
services:
  strezz-k6:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### **Volume Optimization**

```yaml
# Named volumes for better performance
volumes:
  strezz-cache:
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs
      o: size=100m
```

## 🚨 Troubleshooting

### **Common Issues**

#### **Build Failures**
```bash
# Clean build
docker system prune -f
docker build --no-cache --target multi-runner .

# Check Docker version
docker --version
docker-compose --version
```

#### **Runtime Errors**
```bash
# Check container logs
docker logs container_name

# Check container health
docker inspect container_name | grep Health -A 10

# Access container shell
docker exec -it container_name /bin/sh
```

#### **Volume Mount Issues**
```bash
# Check volume permissions
ls -la output/

# Fix permissions
sudo chown -R $USER:$USER output/

# Check Docker volume mounts
docker inspect container_name | grep Mounts -A 20
```

### **Debug Commands**

```bash
# Check image layers
docker history strezz:multi

# Inspect image
docker inspect strezz:multi

# Check container resources
docker stats container_name

# View container filesystem
docker exec -it container_name ls -la /app
```

## 🔮 Future Enhancements

### **Short Term**
- **Multi-architecture**: ARM64 support for Apple Silicon
- **Caching**: Build cache optimization
- **Metrics**: Enhanced health monitoring

### **Medium Term**
- **Kubernetes**: Helm charts and K8s manifests
- **CI/CD**: Automated image building and testing
- **Security**: Vulnerability scanning and updates

### **Long Term**
- **Serverless**: AWS Lambda and Azure Functions
- **Edge**: Cloudflare Workers and edge computing
- **AI**: ML-powered performance optimization

## 📚 Additional Resources

### **Documentation**
- [Docker Official Documentation](https://docs.docker.com/)
- [k6 Docker Guide](https://k6.io/docs/getting-started/installation/docker/)
- [Locust Docker Guide](https://docs.locust.io/en/stable/running-locust-docker.html)

### **Examples**
- [Docker Compose Examples](https://docs.docker.com/compose/compose-file/)
- [Multi-stage Builds](https://docs.docker.com/develop/dev-best-practices/dockerfile_best-practices/)
- [Security Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

**Docker** makes it easy to run Strezz performance tests in any environment with consistent behavior and easy deployment! 🐳
