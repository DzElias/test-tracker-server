# Stage 1: Build client
FROM node:18-alpine as client-builder
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
RUN npm install && npm install --prefix client

# Copy ALL client files (including public/)
COPY client ./client
RUN npm run build --prefix client

# Stage 2: Production image
FROM node:18-alpine
WORKDIR /app

# Copy built client
COPY --from=client-builder /app/client/build ./client/build

# Install server deps
COPY package*.json ./
RUN npm install --production

# Copy server files
COPY server ./server

EXPOSE 3000
CMD ["node", "server/index.js"]