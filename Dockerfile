# Backend Dockerfile
FROM oven/bun:1-alpine AS base

# Install pnpm
RUN bun install -g pnpm

# Install backend dependencies
FROM base AS backend-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Install client dependencies and build client
FROM base AS client-builder
WORKDIR /app/client
COPY client/package.json client/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY client/ ./
RUN pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 bunjs
RUN adduser --system --uid 1001 bunjs

# Copy backend files
COPY --from=backend-deps /app/node_modules ./node_modules
COPY package.json ./
COPY .env ./
COPY src/ ./src/
COPY drizzle.config.ts ./
COPY drizzle/ ./drizzle/

# Copy built client
COPY --from=client-builder /app/client/dist ./client/dist

# Create file_store directory with proper permissions
RUN mkdir -p ./file_store && chown -R bunjs:bunjs ./file_store

USER bunjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "run", "src/index.ts"]