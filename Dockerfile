# Stage 1: Build the React client
FROM node:16-alpine as client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm install
COPY client .
RUN npm run build

# Stage 2: Build the server
FROM node:16-alpine as server-builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm install
COPY server .

# Stage 3: Production image
FROM node:16-alpine
WORKDIR /app

# Copy built client
COPY --from=client-builder /app/client/build ./client/build

# Copy server dependencies and source
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY server ./server
COPY package.json package-lock.json .env ./

# Expose ports (API: 3000, Socket.IO: same port)
EXPOSE 3000

# Start command
CMD ["node", "server/index.js"]