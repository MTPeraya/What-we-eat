# ---- Base Node.js image ----
FROM node:18-alpine AS base
WORKDIR /app

# ---- Install dependencies ----
COPY package*.json ./
RUN npm install

# ---- Copy source code ----
COPY . .

# ---- Build the app (skip ESLint) ----
RUN npm run build

# ---- Expose Next.js backend API port ----
EXPOSE 4000

# ---- Run in production ----
CMD ["npm", "start"]
