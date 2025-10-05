# ---- Backend (Next.js + Prisma) ----
FROM node:20-bullseye AS base   
# Use bullseye instead of alpine for better compatibility

WORKDIR /app

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

# Build Next.js app
RUN npm run build

# Expose backend port
EXPOSE 4000

# Start in production
CMD ["npm", "start"]
