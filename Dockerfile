# Simple Railway Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Change to API directory
WORKDIR /app/apps/api

# Expose port (Railway will override this)
EXPOSE 3001

# Start with ts-node directly (skip build)
CMD ["npx", "ts-node", "src/index.ts"]