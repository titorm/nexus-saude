# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S aiassistant -u 1001

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=base /app/dist ./dist

# Create necessary directories
RUN mkdir -p /app/data/medical_knowledge /app/models /app/logs && \
    chown -R aiassistant:nodejs /app

# Switch to non-root user
USER aiassistant

# Expose port
EXPOSE 8002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Set environment variables
ENV NODE_ENV=production
ENV AI_PORT=8002

# Start the application
CMD ["node", "dist/index.js"]

# Metadata
LABEL \
    org.opencontainers.image.title="Nexus Saúde - AI Medical Assistant" \
    org.opencontainers.image.description="TypeScript-based medical AI assistant service" \
    org.opencontainers.image.version="1.0.0" \
    org.opencontainers.image.vendor="Nexus Saúde"