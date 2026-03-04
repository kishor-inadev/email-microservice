# Multi-stage build for production optimization
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S emailservice -u 1001

# Copy package files and install dependencies
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY index.js ./
COPY src ./src

# Create logs directory
RUN mkdir -p logs && chown -R emailservice:nodejs logs

# Set correct ownership
RUN chown -R emailservice:nodejs /app

# Switch to non-root user
USER emailservice

# Expose port (should match PORT in .env)
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3100/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]