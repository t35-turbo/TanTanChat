# Frontend Dockerfile
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY client/package.json client/pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

COPY client/package.json client/pnpm-lock.yaml* ./
COPY --from=deps /app/node_modules ./node_modules
COPY client/ .

# Build the application
RUN pnpm run build

# Production image, copy all the files and run nginx
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY client/nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
