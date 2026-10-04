# Node 22+ required for native node:sqlite
FROM node:22-alpine

# Install build dependencies if needed for canvas fonts/rendering
RUN apk add --no-cache \
    fontconfig \
    freetype \
    ttf-dejavu \
    ca-certificates

WORKDIR /app

# Install dependencies first (for docker layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Create volume mount point for persistent SQLite database
VOLUME ["/app/data"]

ENV NODE_ENV=production

# Start Gandalf the BOT
CMD ["node", "index.js"]
