# NatGeo SaaS — CLAUDE.md

## Deploy Configuration (configured by /setup-deploy)
- Platform: Coolify (Docker, self-hosted)
- Production URL: http://byy6u6lkrgic5tca4vlhvgy8.177.7.43.206.sslip.io
- Deploy workflow: auto-deploy on push to main (Coolify monitora o repositório GitHub)
- Deploy status command: HTTP health check
- Merge method: merge
- Project type: web app + API (Node.js/Express + HTML dashboards)
- Post-deploy health check: http://byy6u6lkrgic5tca4vlhvgy8.177.7.43.206.sslip.io/health

### Custom deploy hooks
- Pre-merge: none
- Deploy trigger: git push origin main (Coolify detecta automaticamente)
- Deploy status: poll http://byy6u6lkrgic5tca4vlhvgy8.177.7.43.206.sslip.io/health
- Health check: http://byy6u6lkrgic5tca4vlhvgy8.177.7.43.206.sslip.io/health

### Infraestrutura
- Git remote: https://github.com/good4youadm-ops/DASHBOARD-NATGEO.git
- Docker: multi-stage build (node:20-slim), porta 3001
- Dockerfile: raiz do projeto
- Workers: oracle-sync (index.ts), import-worker (index.ts)
- Banco: Supabase PostgreSQL
