# ---- Backend (Next.js + Prisma) ----
FROM node:20-alpine AS base

WORKDIR /app

# Copy dependency files and prisma schema first
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy rest of backend source
COPY . .

# Build Next.js app
RUN npm run build

# Expose backend port
EXPOSE 4000

# Start in production
CMD ["npm", "start"]
