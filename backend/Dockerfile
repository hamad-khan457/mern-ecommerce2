# ── Stage 1: Build ──────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency files first (layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# ── Stage 2: Runtime ─────────────────────────────────────────────────────
FROM node:18-alpine

WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY . .

# Expose the Express server port
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]
