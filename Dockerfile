# Stage 1: Build client
FROM node:16-alpine as client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm install
COPY client .
RUN npm run build

# Stage 2: Build server
FROM node:16-alpine
WORKDIR /app

# Copy built client
COPY --from=client-builder /app/client/build ./client/build

# Install server dependencies
COPY package.json package-lock.json ./
RUN npm install --production

# Copy server files
COPY server ./server
COPY .env .

EXPOSE 3000
CMD ["node", "server/index.js"]