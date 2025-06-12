# Stage 1: Build the React client
FROM node:16-alpine as client-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY client/ ./client/
RUN npm run build --prefix client

# Stage 2: Build the server
FROM node:16-alpine
WORKDIR /app

# Copy built client
COPY --from=client-builder /app/client/build ./client/build

# Copy server files
COPY package.json package-lock.json ./
RUN npm install --production
COPY server/ ./server/
COPY .env .

EXPOSE 3000
CMD ["node", "server/index.js"]