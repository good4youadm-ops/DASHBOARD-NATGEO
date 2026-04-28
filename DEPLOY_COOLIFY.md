# Deploy no Coolify — NatGeo Dashboard SaaS

Guia completo para subir o projeto em uma VPS usando o Coolify.

---

## Pré-requisitos

- VPS com Coolify instalado (Ubuntu 22.04+ recomendado)
- Repositório Git acessível pelo Coolify (GitHub, GitLab ou self-hosted)
- Projeto Supabase criado e migrations aplicadas
- Oracle Instant Client disponível na rede da VPS (ou VPN configurada)

---

## 1. Criar o projeto no Coolify

1. Acesse o painel do Coolify → **Projects → New Project**
2. Nome: `natgeo-dashboard`
3. Clique em **Add New Resource → Docker Compose**
4. Conecte o repositório Git

---

## 2. Qual docker-compose usar

No campo **Docker Compose File**, informe:

```
docker-compose.prod.yml
```

O Coolify usará este arquivo que já está configurado para produção (imagem compilada, sem tsx, com healthcheck e restart automático).

---

## 3. Variáveis de ambiente

No painel do Coolify, vá em **Environment Variables** e configure todas as variáveis abaixo.
**Nunca commite o arquivo `.env` no repositório.**

### Obrigatórias

| Variável | Exemplo | Descrição |
|---|---|---|
| `NODE_ENV` | `production` | Ambiente de execução |
| `PORT` | `3001` | Porta da API |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Chave anon (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Chave service_role (secreta) |
| `ORACLE_USER` | `natgeo_user` | Usuário Oracle |
| `ORACLE_PASSWORD` | `senha` | Senha Oracle |
| `ORACLE_CONNECT_STRING` | `192.168.1.100:1521/ORCL` | Connection string Oracle |
| `SYNC_DEFAULT_TENANT_ID` | `00000000-0000-0000-0000-000000000001` | UUID do tenant |

### Recomendadas

| Variável | Padrão | Descrição |
|---|---|---|
| `CORS_ORIGIN` | `https://seudominio.com` | Origem permitida na API |
| `SYNC_INTERVAL_SECONDS` | `1800` | Intervalo entre syncs (s) |
| `SYNC_BATCH_SIZE` | `500` | Lote de upsert |
| `LOG_LEVEL` | `info` | Nível de log (debug/info/warn/error) |
| `LOG_FILE` | `logs/api.log` | Arquivo de log da API |
| `API_SECRET_KEY` | `(gerar)` | `openssl rand -hex 32` |

---

## 4. Apontar domínio

No Coolify, vá em **Domains** do serviço `api`:

1. Adicione o domínio: `api.seudominio.com`
2. Coolify gerencia o proxy reverso (Traefik) automaticamente

Os dashboards HTML apontam para `http://localhost:3001` por padrão. Após ter o domínio, configure `__API_URL__` nas páginas HTML:

```html
<!-- No <head> de cada dashboard, antes de js/api.js -->
<script>window.__API_URL__ = 'https://api.seudominio.com';</script>
<script src="js/api.js"></script>
```

---

## 5. Ativar HTTPS

O Coolify ativa HTTPS automaticamente via Let's Encrypt quando você adiciona um domínio.
Certifique-se de que:
- A porta 80 e 443 estão abertas no firewall da VPS
- O DNS do domínio aponta para o IP da VPS (registro A)

---

## 6. Validar a API após deploy

```bash
# Health básico
curl https://api.seudominio.com/health

# Resposta esperada:
# {"status":"ok","env":"production","version":"1.0.0","uptime":42,"timestamp":"..."}

# Health completo (testa Supabase + sync)
curl https://api.seudominio.com/health/deep

# Testar endpoint de vendas
curl https://api.seudominio.com/api/dashboard/sales/summary?months=3
```

---

## 7. Rodar sync inicial após deploy

No painel do Coolify, abra o terminal do container `sync-worker`, ou use:

```bash
# Via Coolify terminal (serviço sync-worker):
node dist/workers/oracle-sync/index.js all --full

# Via SSH na VPS:
docker exec -it dashboardnatgeo_sync \
  node dist/workers/oracle-sync/index.js all --full
```

O `--full` ignora checkpoints e sincroniza tudo do Oracle. Use apenas na primeira vez ou após reset.

---

## 8. Ver logs

```bash
# Todos os serviços
docker compose -f docker-compose.prod.yml logs -f

# Apenas API
docker compose -f docker-compose.prod.yml logs -f api

# Apenas worker
docker compose -f docker-compose.prod.yml logs -f sync-worker

# Via Coolify: painel → serviço → aba Logs (tempo real)
```

Os logs também são gravados em:
- `logs/api.log` — requisições e erros da API
- `logs/sync.log` — execuções do sync Oracle

---

## 9. Reiniciar serviços

```bash
# Reiniciar API
docker compose -f docker-compose.prod.yml restart api

# Reiniciar worker
docker compose -f docker-compose.prod.yml restart sync-worker

# Via Coolify: botão "Restart" no painel do serviço
```

---

## 10. Atualizar deploy via Git

O Coolify detecta pushes no branch configurado e redeploya automaticamente.

Fluxo recomendado:
```bash
git add .
git commit -m "feat: descrição da mudança"
git push origin main
# Coolify inicia novo build e deploy automaticamente
```

Para deploy manual no Coolify: painel → projeto → **Redeploy**.

---

## Simulação local de produção (sem VPS)

Para testar o ambiente de produção localmente antes de subir:

```bash
# Crie o .env a partir do exemplo
cp .env.example .env
# Preencha as variáveis reais no .env

# Build e start em modo produção
npm run docker:prod

# Testar
curl http://localhost:3001/health
curl http://localhost:3001/health/deep
```

---

## Checklist pré-VPS

- [ ] `.env` preenchido com credenciais reais
- [ ] Supabase: migrations aplicadas (`supabase db push`)
- [ ] `docker compose -f docker-compose.prod.yml build` sem erros
- [ ] `docker compose -f docker-compose.prod.yml up` — API responde em `localhost:3001/health`
- [ ] `/health/deep` retorna `supabase: {ok: true}`
- [ ] Sync dry-run sem erros: `docker exec dashboardnatgeo_sync node dist/workers/oracle-sync/index.js all --dry-run`
- [ ] Repositório Git configurado no Coolify
- [ ] Variáveis de ambiente configuradas no Coolify (não no repositório)
- [ ] Domínio apontando para IP da VPS
- [ ] HTTPS ativo e certificado válido
- [ ] Sync full inicial executado após primeiro deploy
- [ ] `/health` respondendo via HTTPS no domínio público
