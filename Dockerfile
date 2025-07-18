# Backend Dockerfile
FROM oven/bun:1-alpine AS base

# Install pnpm
RUN bun install -g pnpm

# Build stage - install dependencies and build both backend and client
FROM base AS builder
WORKDIR /app

# Copy all source files first
COPY . .

# Install backend dependencies
RUN pnpm install --frozen-lockfile

# Install client dependencies and build client
WORKDIR /app/client
RUN pnpm install --frozen-lockfile

# Make sure the client can see the backend types during build
# The client should import from ../../src/index not ../../../src/index
RUN pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 bunjs
RUN adduser --system --uid 1001 bunjs

# Copy backend files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src/ ./src/
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/drizzle/ ./drizzle/

# Copy environment file if it exists
COPY --from=builder /app/.env* ./

# Copy built client
COPY --from=builder /app/client/dist ./client/dist

# Create file_store directory with proper permissions
RUN mkdir -p ./file_store && chown -R bunjs:bunjs ./file_store

USER bunjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "bunx drizzle-kit push && bun run src/index.ts"]