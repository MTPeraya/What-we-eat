# ---- Backend (Next.js + Prisma) ----
FROM node:20-bullseye AS base   
# Use bullseye instead of alpine for better compatibility

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy dependency files and Prisma schema first
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy rest of backend source
COPY . .

# Remove potentially invalid NODE_OPTIONS
ENV NODE_OPTIONS=""

# Expose backend port (for dev mode, build happens at runtime)
EXPOSE 4001

# Note: In docker-compose, we override CMD to use dev mode
# For production, uncomment the build and start commands below:
# RUN npm run build
# CMD ["npm", "start"]
