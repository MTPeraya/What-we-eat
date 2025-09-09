FROM node:20-bullseye-slim

WORKDIR /app
COPY package*.json ./

# Install all dependencies including optional ones
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
