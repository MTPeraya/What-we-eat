# ---- Frontend (Vite + React) ----
FROM node:20-bullseye-slim

WORKDIR /app

# Copy dependency files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose Vite dev server
EXPOSE 5173

# For dev (hot reload) - --host flag is already in vite.config.js
CMD ["npm", "run", "dev"]