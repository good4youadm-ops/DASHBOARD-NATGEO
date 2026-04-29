# ── Stage 1: deps ────────────────────────────────────────────────────────────
# oracledb v6+ funciona em modo thin (puro JS, sem Oracle Instant Client).
# Não é necessário baixar bibliotecas nativas do Oracle.
FROM node:20-slim AS deps

WORKDIR /app
# Força development para que npm ci instale devDependencies (tsc, tipos, etc.)
# independente do build-arg NODE_ENV que o Coolify injeta
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM deps AS builder

COPY tsconfig*.json ./
COPY src/ ./src/
COPY workers/ ./workers/

RUN npm run build \
    && npm prune --omit=dev

# ── Stage 3: production ───────────────────────────────────────────────────────
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

WORKDIR /app
RUN mkdir -p logs

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY *.html ./
COPY js/ ./js/

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/src/api/server.js"]
