FROM node:22-slim

WORKDIR /usr/src/app
ENV NODE_ENV=development
FROM node:22-slim

WORKDIR /usr/src/app
ENV NODE_ENV=development

# Install deps
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Healthcheck hits /health
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

EXPOSE 4000
CMD ["npm","run","dev"]
