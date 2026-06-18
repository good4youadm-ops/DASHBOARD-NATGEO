# ── Stage 1: deps ────────────────────────────────────────────────────────────
# oracledb v6+ funciona em modo thin (puro JS, sem Oracle Instant Client).
FROM node:20-slim AS deps

WORKDIR /app
# NODE_ENV=development para que npm ci instale devDependencies (tsc, tipos)
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM deps AS builder

COPY tsconfig*.json ./
COPY src/ ./src/
COPY workers/ ./workers/

RUN npm run build

# ── Stage 3: production ───────────────────────────────────────────────────────
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

WORKDIR /app
RUN mkdir -p logs

# Instala apenas dependências de produção (evita npm prune)
COPY package*.json ./
RUN npm ci --omit=dev

# Copia o dist compilado
COPY --from=builder /app/dist ./dist
COPY *.html ./
COPY js/ ./js/

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/src/api/server.js"]
