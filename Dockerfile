# Multi-stage Dockerfile for Strezz Performance Test Generator
# Supports both k6 and Locust backends

# Stage 1: Build the Node.js application
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Runtime with k6 support
FROM grafana/k6:latest AS k6-runner

# Install Node.js for the Strezz CLI
RUN apk add --no-cache nodejs npm

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/examples ./examples
COPY --from=builder /app/scripts ./scripts

# Install only production dependencies
RUN npm ci --only=production

# Create non-root user
RUN addgroup -g 1001 -S strezz && \
    adduser -S strezz -u 1001 -G strezz

# Change ownership of app directory
RUN chown -R strezz:strezz /app

# Switch to non-root user
USER strezz

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node --version && k6 version || exit 1

# Default command
CMD ["node", "dist/strezz.js", "--help"]

# Stage 3: Runtime with Locust support
FROM locustio/locust:latest AS locust-runner

# Install Node.js for the Strezz CLI
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/examples ./examples
COPY --from=builder /app/scripts ./scripts

# Install only production dependencies
RUN npm ci --only=production

# Create non-root user
RUN groupadd -r strezz && useradd -r -g strezz strezz

# Change ownership of app directory
RUN chown -R strezz:strezz /app

# Switch to non-root user
USER strezz

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node --version && locust --version || exit 1

# Default command
CMD ["node", "dist/strezz.js", "--help"]

# Stage 4: Multi-backend runtime (default)
FROM grafana/k6:latest AS multi-runner

# Install Node.js and Python for both backends
RUN apk add --no-cache nodejs npm python3 py3-pip

# Install Locust
RUN pip3 install locust

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/examples ./examples
COPY --from=builder /app/scripts ./scripts

# Install only production dependencies
RUN npm ci --only=production

# Create non-root user
RUN addgroup -g 1001 -S strezz && \
    adduser -S strezz -u 1001 -G strezz

# Change ownership of app directory
RUN chown -R strezz:strezz /app

# Switch to non-root user
USER strezz

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node --version && k6 version && locust --version || exit 1

# Default command
CMD ["node", "dist/strezz.js", "--help"]
