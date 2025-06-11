FROM node:16-alpine
WORKDIR /app
COPY package.json .
COPY server.js .
RUN npm install
EXPOSE 9001
CMD ["node", "server.js"]