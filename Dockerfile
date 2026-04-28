# ── Stage 1: deps ────────────────────────────────────────────────────────────
# Instala Oracle Instant Client + todas as dependências (devDeps incluídas)
# necessárias para compilar o addon nativo oracledb e o TypeScript.
FROM node:20-slim AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
      libaio1 wget unzip python3 make g++ \
    && mkdir -p /opt/oracle \
    && cd /opt/oracle \
    && wget -q https://download.oracle.com/otn_software/linux/instantclient/2111000/instantclient-basiclite-linux.x64-21.11.0.0.0dbru.zip \
    && unzip -q instantclient-basiclite-linux.x64-21.11.0.0.0dbru.zip \
    && rm instantclient-basiclite-linux.x64-21.11.0.0.0dbru.zip \
    && echo /opt/oracle/instantclient_21_11 > /etc/ld.so.conf.d/oracle-instantclient.conf \
    && ldconfig \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_21_11:$LD_LIBRARY_PATH

WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: builder ──────────────────────────────────────────────────────────
# Compila TypeScript e remove devDeps do node_modules.
FROM deps AS builder

COPY tsconfig*.json ./
COPY src/ ./src/
COPY workers/ ./workers/

RUN npm run build \
    && npm prune --omit=dev

# ── Stage 3: production ───────────────────────────────────────────────────────
# Imagem final enxuta: Oracle runtime + prodDeps + dist compilado.
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends \
      libaio1 curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Reutiliza Oracle do stage builder (evita re-download)
COPY --from=deps /opt/oracle /opt/oracle
RUN echo /opt/oracle/instantclient_21_11 > /etc/ld.so.conf.d/oracle-instantclient.conf && ldconfig

ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_21_11:$LD_LIBRARY_PATH
ENV NODE_ENV=production

WORKDIR /app
RUN mkdir -p logs

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# CMD padrão: API. O sync-worker sobrescreve no docker-compose.
CMD ["node", "dist/src/api/server.js"]
