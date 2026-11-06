FROM node:18-alpine

WORKDIR /app

# Cài dependencies trước để tận dụng layer cache của Docker
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
