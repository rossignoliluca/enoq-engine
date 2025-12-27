# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                         ENOQ-CORE DOCKERFILE                              ║
# ║                                                                           ║
# ║  Sistema Operativo Totale per l'Esistenza Umana                           ║
# ║                                                                           ║
# ║  SECURITY: API keys via environment only, NEVER baked into image         ║
# ║                                                                           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY src/typescript/package*.json ./

# Install dependencies (npm ci for reproducibility)
RUN npm ci

# Copy source code
COPY src/typescript/src ./src
COPY src/typescript/tsconfig.json ./

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache python3 make g++ wget

# Create non-root user
RUN addgroup -g 1001 -S enoq && \
    adduser -S enoq -u 1001 -G enoq

# Copy package files
COPY src/typescript/package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create data directory with correct permissions
RUN mkdir -p /data && chown -R enoq:enoq /data

# Switch to non-root user
USER enoq

# Environment (no secrets here!)
ENV NODE_ENV=production
ENV ENOQ_DB_PATH=/data/enoq.sqlite

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/healthz || exit 1

# Default: run HTTP server (not CLI)
CMD ["node", "dist/server.js"]
