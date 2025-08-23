# Frontend Dockerfile
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files for both client and server
COPY client/package.json client/pnpm-lock.yaml* ./
COPY package.json pnpm-lock.yaml* ../

# Install client dependencies
RUN pnpm install --no-frozen-lockfile

# Install server dependencies (needed for type imports)
WORKDIR /
RUN pnpm install --no-frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy server dependencies and source code first
COPY --from=deps /node_modules ../node_modules
COPY package.json ../package.json
COPY src/ ../src/

# Copy client files and dependencies
COPY client/package.json client/pnpm-lock.yaml* ./
COPY --from=deps /app/node_modules ./node_modules
COPY client/ .

# Install deps (backup)
RUN pnpm install

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
