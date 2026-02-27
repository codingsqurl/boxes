FROM node:18-alpine

WORKDIR /app

# Install dependencies first (layer cache — only rebuilds when package.json changes)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server code and static site
COPY server/ ./server/
COPY css/     ./css/
COPY js/      ./js/
COPY icons/   ./icons/
COPY pictures/ ./pictures/
COPY index.html ./
COPY reviews.json ./

EXPOSE 3000

CMD ["node", "server/index.js"]
