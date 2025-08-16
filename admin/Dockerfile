# ---- Base settings ----------------------------------------------------------
ARG NODE_VERSION=20-alpine
ARG APP_DIR=/app

# ---- Builder: install & build -----------------------------------------------
FROM node:${NODE_VERSION} AS builder
ARG APP_DIR
WORKDIR ${APP_DIR}

ENV NODE_ENV=development
ENV npm_config_fund=false npm_config_audit=false

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source and build
COPY . .
RUN npm run build

# ---- Runtime: minimal, non-root, production deps only -----------------------
FROM node:${NODE_VERSION} AS runtime
ARG APP_DIR
WORKDIR ${APP_DIR}

ENV NODE_ENV=production \
    PORT=3001

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files and install prod dependencies
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy built artifacts from builder
COPY --from=builder ${APP_DIR}/dist ./dist

# Create logs directory
RUN mkdir -p logs

# Non-root user
RUN addgroup -S nodegrp && adduser -S nodeuser -G nodegrp && \
    chown -R nodeuser:nodegrp logs
USER nodeuser

# Expose Admin port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Start command
CMD [ "npm", "run", "start" ]