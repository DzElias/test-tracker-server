# Stage 1: Build client with all dependencies
FROM node:16-alpine as client-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json

# Install root and client dependencies
RUN npm install
RUN npm install --prefix client

# Copy and build client
COPY client ./client
RUN npm run build --prefix client

# Stage 2: Production image
FROM node:16-alpine
WORKDIR /app

# Copy built client
COPY --from=client-builder /app/client/build ./client/build

# Install server dependencies
COPY package.json package-lock.json ./
RUN npm install --production

# Copy server files
COPY server ./server

EXPOSE 3000
CMD ["node", "server/index.js"]