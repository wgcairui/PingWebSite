# ── Build stage ──────────────────────────────────────────────────────────────
FROM m.daocloud.io/docker.io/oven/bun:1-alpine AS base

WORKDIR /app

# Copy only what is needed for production (no node_modules – pure Bun)
COPY package.json ./
COPY src ./src

# ── Runtime ───────────────────────────────────────────────────────────────────
ENV NODE_ENV=production

# Mount the credentials at runtime:
#   docker run -v /path/to/key.json:/app/src/key.json ...
CMD ["bun", "run", "src/index.ts"]