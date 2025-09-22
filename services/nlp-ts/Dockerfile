# Production Dockerfile for NLP Service
FROM node:18-alpine AS base

# Install system dependencies for ML/NLP libraries
RUN apk add --no-cache python3 py3-pip build-base

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Create production image
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache python3 py3-pip

# Create app directory
WORKDIR /app

# Copy built application
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

# Create directories for data and models
RUN mkdir -p /app/data /app/models

# Create non-root user
RUN addgroup -g 1001 -S nlpuser && \
    adduser -S nlpuser -u 1001 -G nlpuser
    
# Change ownership of app directory
RUN chown -R nlpuser:nlpuser /app

# Switch to non-root user
USER nlpuser

# Expose port
EXPOSE 3007

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3007/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]