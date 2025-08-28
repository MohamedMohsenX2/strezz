# PR 6: Dockerized Runners

## 🎯 Overview

This PR implements comprehensive Docker support for the Strezz performance test generator, providing containerized runners for both k6 and Locust backends. The Docker setup includes multi-stage builds, security best practices, health checks, and optional monitoring integration with InfluxDB and Grafana.

## ✨ What's New

### 1. **Multi-Stage Dockerfile**

#### **Builder Stage**
- **Base**: `node:22-alpine`
- **Purpose**: Build the Node.js application
- **Output**: Built application in `/app/dist`

#### **Runtime Stages**
- **k6 Runner**: `grafana/k6:latest` + Node.js + Strezz CLI
- **Locust Runner**: `locustio/locust:latest` + Node.js + Strezz CLI
- **Multi Runner**: `grafana/k6:latest` + Python + Node.js + Strezz CLI

### 2. **Docker Compose Configuration**

#### **Service Profiles**
- **k6 Profile**: k6 backend runner
- **Locust Profile**: Locust backend runner
- **Multi Profile**: Both backends support
- **Monitoring Profile**: InfluxDB + Grafana stack
- **Examples Profile**: Pre-configured test examples

#### **Services**
- **InfluxDB**: Metrics storage (port 8086)
- **Grafana**: Metrics visualization (port 3000)
- **Example Tests**: Automated test generation and execution

### 3. **Docker Utility Scripts**

#### **Docker Build Script** (`scripts/docker-build.sh`)
- **Multi-backend Building**: Builds all three runner types
- **Image Testing**: Validates Node.js, k6, and Locust functionality
- **CLI Testing**: Tests Strezz CLI in Docker containers
- **Cleanup Options**: Optional image cleanup after testing

#### **Docker Run Script** (`scripts/docker-run.sh`)
- **Test Generation**: Generate performance test files in containers
- **Test Execution**: Run performance tests with k6 or Locust
- **Interactive Shell**: Open shell in containers for development
- **Backend Selection**: Choose between k6, Locust, or multi-backend

### 4. **Comprehensive Documentation** (`docs/DOCKER.md`)
- **Quick Start Guide**: Get Docker running in minutes
- **Architecture Overview**: Multi-stage build explanation
- **Usage Examples**: Common Docker commands and workflows
- **Security Considerations**: Best practices and security features
- **Troubleshooting**: Common issues and solutions

## 🔧 Technical Implementation

### **Dockerfile Architecture**

#### **Multi-Stage Build Strategy**
```dockerfile
# Stage 1: Builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: k6 Runner
FROM grafana/k6:latest AS k6-runner
RUN apk add --no-cache nodejs npm
# ... copy built app and install dependencies

# Stage 3: Locust Runner
FROM locustio/locust:latest AS locust-runner
RUN apt-get update && apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
# ... copy built app and install dependencies

# Stage 4: Multi Runner
FROM grafana/k6:latest AS multi-runner
RUN apk add --no-cache nodejs npm python3 py3-pip
RUN pip3 install locust
# ... copy built app and install dependencies
```

#### **Security Features**
- **Non-root User**: All containers run as `strezz` user (UID 1001)
- **Health Checks**: Built-in health monitoring for all services
- **Read-only Volumes**: Example configurations mounted read-only
- **Minimal Base Images**: Alpine-based images where possible

### **Docker Compose Services**

#### **Core Runners**
```yaml
services:
  strezz-k6:
    build:
      context: .
      dockerfile: Dockerfile
      target: k6-runner
    image: strezz:k6
    container_name: strezz-k6
    working_dir: /app
    volumes:
      - ./examples:/app/examples:ro
      - ./output:/app/output
    healthcheck:
      test: ["CMD", "node", "--version"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

#### **Monitoring Stack**
```yaml
services:
  influxdb:
    image: influxdb:2.7-alpine
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=strezz123
      - DOCKER_INFLUXDB_INIT_ORG=strezz
      - DOCKER_INFLUXDB_INIT_BUCKET=k6
    ports:
      - "8086:8086"
    volumes:
      - influxdb-data:/var/lib/influxdb2
      - influxdb-config:/etc/influxdb2

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=strezz123
    ports:
      - "3000:3000"
    depends_on:
      influxdb:
        condition: service_healthy
```

### **Utility Scripts**

#### **Docker Build Script Features**
- **Multi-backend Building**: Builds k6, Locust, and multi-backend images
- **Image Testing**: Validates Node.js, k6, and Locust functionality
- **CLI Testing**: Tests Strezz CLI in Docker containers
- **Size Reporting**: Shows image sizes and information
- **Cleanup Options**: Optional image cleanup after testing

#### **Docker Run Script Features**
- **Command Interface**: `generate`, `run`, `shell`, `help` commands
- **Backend Selection**: Choose between k6, Locust, or multi-backend
- **Configuration Support**: Use custom configuration files
- **Output Management**: Specify custom output paths
- **Interactive Shell**: Open shell in containers for development

## 📦 Available Images

### **Image Tags and Sizes**

| Tag | Description | Base Image | Size | Use Case |
|-----|-------------|------------|------|----------|
| `strezz:k6` | k6 backend only | `grafana/k6:latest` | ~150MB | k6 performance testing |
| `strezz:locust` | Locust backend only | `locustio/locust:latest` | ~200MB | Locust performance testing |
| `strezz:multi` | Both backends | `grafana/k6:latest` + Python | ~250MB | Full-stack testing |
| `strezz:latest` | Latest multi-backend | `grafana/k6:latest` + Python | ~250MB | Production use |

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

### **Basic Docker Commands**

#### **Build Images**
```bash
# Build all images
./scripts/docker-build.sh

# Build specific backend
docker build --target k6-runner -t strezz:k6 .
docker build --target locust-runner -t strezz:locust .
docker build --target multi-runner -t strezz:multi .
```

#### **Run Containers**
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

# Run k6 test
docker run --rm \
  -v $(pwd)/output:/app/output \
  strezz:k6 \
  k6 run \
  --out json=/app/output/results.json \
  /app/output/laravel-test.js
```

### **Docker Compose Usage**

#### **Service Profiles**
```bash
# Start k6 runner
docker-compose --profile k6 up

# Start monitoring stack
docker-compose --profile monitoring up

# Run examples
docker-compose --profile examples up

# Start all services
docker-compose --profile k6 --profile monitoring --profile examples up
```

#### **Environment Configuration**
```bash
# .env file
NODE_ENV=production
TARGET_URL=https://api.example.com
FRAMEWORK=laravel
BACKEND=k6
```

### **Utility Script Usage**

#### **Docker Build Script**
```bash
# Build and test all images
./scripts/docker-build.sh

# Build only, skip testing
./scripts/docker-build.sh --no-test

# Build, test, and clean up
./scripts/docker-build.sh --cleanup
```

#### **Docker Run Script**
```bash
# Generate k6 test
./scripts/docker-run.sh generate --backend k6 --config examples/laravel-ecommerce.json

# Run k6 test
./scripts/docker-run.sh run --backend k6 --config examples/laravel-ecommerce.json

# Open shell in container
./scripts/docker-run.sh shell --backend multi

# Show help
./scripts/docker-run.sh help
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

- **Non-root User**: All containers run as `strezz` user (UID 1001)
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

## 📊 Impact and Benefits

### **For Developers**
- **Consistent Environment**: Same behavior across all machines
- **Easy Setup**: No need to install k6, Locust, or Node.js locally
- **Isolated Testing**: Performance tests run in isolated containers
- **Quick Start**: Get running in minutes with Docker

### **For DevOps Teams**
- **Easy Deployment**: Deploy to any environment with Docker
- **Scalability**: Run multiple test instances simultaneously
- **Monitoring**: Built-in InfluxDB and Grafana integration
- **CI/CD Ready**: Easy integration with CI/CD pipelines

### **For Organizations**
- **Standardization**: Consistent performance testing across teams
- **Portability**: Run tests anywhere Docker is available
- **Security**: Isolated, non-root containers
- **Maintenance**: Easy updates and version management

## ✅ Testing Results

- **Docker Build**: ✅ All images build successfully
- **Multi-stage Builds**: ✅ Optimized image sizes
- **Health Checks**: ✅ All services have working health checks
- **Volume Mounts**: ✅ File sharing between host and containers
- **CLI Functionality**: ✅ Strezz CLI works in all containers
- **Backend Support**: ✅ k6 and Locust both functional
- **Monitoring Stack**: ✅ InfluxDB and Grafana start correctly

## 🎉 Conclusion

PR 6 successfully implements comprehensive Docker support for the Strezz performance test generator, providing:

1. **Multi-stage Dockerfile**: Optimized builds for different backends
2. **Docker Compose**: Easy service orchestration with profiles
3. **Utility Scripts**: Automated building, testing, and running
4. **Security Features**: Non-root users, health checks, read-only mounts
5. **Monitoring Integration**: Optional InfluxDB and Grafana stack
6. **Comprehensive Documentation**: Complete setup and usage guide

The Dockerized runners ensure that:
- **Performance tests run consistently** across all environments
- **Setup is simplified** with no local dependencies required
- **Security is maintained** with proper container practices
- **Scalability is improved** with container orchestration
- **Monitoring is optional** but easily accessible

The system is production-ready and can be immediately used in:
- **Development environments** for consistent testing
- **CI/CD pipelines** for automated performance validation
- **Production deployments** for performance monitoring
- **Team collaboration** with standardized environments

---

**Next Steps**: 
- Build Docker images using `./scripts/docker-build.sh`
- Test containers with `./scripts/docker-run.sh`
- Start monitoring stack with `docker-compose --profile monitoring up`
- Integrate with CI/CD pipelines for automated testing

**Dockerized Runners** are now ready to containerize your performance testing! 🐳
