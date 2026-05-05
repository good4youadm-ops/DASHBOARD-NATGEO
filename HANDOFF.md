# Handoff: NatGeo Dashboard — Sidebar unificada, zeros e importação CSV

*Data:* 2026-05-05
*Status:* Em andamento — 1 bug conhecido restante (`dashboard-distribuidora.html`)

---

## 1. Objetivo

Sistema de gestão para uma distribuidora de alimentos/produtos naturais (NatGeo).
O frontend são 13 arquivos HTML estáticos com Chart.js e JS vanilla, servidos por um
Express + Supabase no backend, deployado via Docker no Coolify (auto-deploy ao fazer
`git push origin main`).

O trabalho desta sessão foi tornar o sistema visualmente coeso como o Bling ERP:
sidebar idêntica em todas as páginas, dados fictícios zerados e botão de importação
CSV/Excel em todas as abas.

---

## 2. Contexto essencial

### Stack
- **Frontend:** HTML estático + vanilla JS + Chart.js — SEM React/Next.js
- **Backend:** Node.js + Express (`src/api/server.ts`)
- **Banco:** Supabase (PostgreSQL). Migrations em `supabase/migrations/` (8 arquivos SQL)
- **Sync:** Worker Oracle ERP → Supabase em `workers/oracle-sync/`
- **Deploy:** Coolify self-hosted, Docker multi-stage build. Push ao GitHub aciona rebuild.
- **URL produção:** `http://byy6u6lkrgic5tca4vlhvgy8.177.7.43.206.sslip.io`
- **Repo GitHub:** `good4youadm-ops/DASHBOARD-NATGEO` (branch `main`)
- **Diretório local:** `c:\Users\Natgeo50\Documents\dashboardnatgeo`

### Decisões já tomadas
- **sidebar.js canônico:** Em vez de manter HTML de sidebar em cada arquivo, criamos
  `js/sidebar.js` que injeta toda a sidebar via JS. Cada página tem apenas
  `<aside class="sidebar"></aside>` vazio. A página ativa é detectada pelo
  `location.pathname`.
- **DOMContentLoaded obrigatório:** `sidebar.js` usa `DOMContentLoaded` porque em
  algumas páginas o `<script src="js/sidebar.js">` aparece ANTES do `<aside>` no DOM.
- **Evento `sidebarReady`:** Após injetar o HTML, `sidebar.js` dispara
  `document.dispatchEvent(new CustomEvent('sidebarReady'))`. O `auth.js` escuta
  esse evento para popular `#userInitials` e `#userName` DEPOIS que a sidebar existe.
- **Dados zerados:** Valores fictícios hardcoded foram removidos; a API retorna os dados
  reais (quando existirem). Sem fallback para mocks.
- **Importação CSV:** `js/import.js` criado com modal drag-and-drop. Envia para
  `/api/import` (endpoint ainda não implementado no backend).

### Restrições
- Não usar React ou qualquer framework — tudo vanilla JS
- O Coolify faz build Docker a cada push. Se o TypeScript falhar no build, o app
  não sobe. Sempre verificar o log de deploy antes de considerar concluído.
- As migrations do Supabase ainda NÃO foram aplicadas no banco. O banco está vazio.
  Por isso todas as APIs retornam erros (views não existem) e os dashboards mostram
  estado vazio — que é o comportamento correto por enquanto.

---

## 3. O que já foi feito

### Sessão anterior (antes desta)
1. Criação de todos os 13 arquivos HTML de dashboard
2. Correção de build Docker (`workers/oracle-sync/index.ts` — import de `config` ausente)
3. Primeira tentativa de unificação de sidebar via scripts Python (`fix_sidebar.py`,
   `fix_sidebar2.py`) — substituição de CSS nas páginas com sidebar clara
4. Adição de links cruzados entre páginas (financeiro → lancamentos, comercial → estoque, etc.)
5. URL tab routing em `lancamentos.html` via `?tab=ar` e `?tab=ap`

### Esta sessão
6. **`js/sidebar.js` criado** — injeta sidebar canônica em todas as 13 páginas via
   DOMContentLoaded. Detecta página ativa pelo URL. Dispara evento `sidebarReady`.
7. **`js/auth.js` refatorado** — `populateSidebarUser()` separado, aguarda
   `sidebarReady` antes de preencher nome/iniciais/logout.
8. **`fix_all.py` executado** — limpou o HTML interno de `<aside class="sidebar">`
   em todas as 13 páginas, injetou `<script src="js/sidebar.js">` em cada arquivo,
   adicionou botão "Importar" em todas as páginas.
9. **`js/import.js` criado** — modal drag-and-drop completo para CSV/XLS/XLSX.
   Inclui seleção de tipo de dado (clientes, produtos, pedidos, lançamentos, etc.).
10. **Dados zerados:**
    - `dashboard-comercial.html`: mock `DATA` object zerado com nulls após bloco JS
    - `financeiro.html`: KPIs hardcoded (`R$ 342K`, etc.) → `—`; arrays de gráfico
      (`fatBruto12`, `margem12`, `meta12`, `wfVG`) esvaziados
    - `estoque.html`: todos `kpi-value` hardcoded → `—`
11. **sidebar.js movido do `<head>` para `</body>`** em: `fiscal.html`,
    `fluxo-caixa.html`, `metas.html`, `orcamentos.html`, `cadastros.html`
    (estavam no head antes, o que fazia o script rodar antes do DOM existir)

### Descartado / falhou
- **Tentativa de sidebar.js síncrono:** Primeiro tentamos sem DOMContentLoaded,
  esperando que o script sempre estivesse depois do `<aside>`. Falhou porque em
  `dashboard-comercial.html` o `sidebar.js` está na linha 306 e o `<aside>` na 312.
  Revertemos para DOMContentLoaded.

---

## 4. Estado atual

### O que funciona ✅
- **12 de 13 páginas** com sidebar idêntica, verde escura, com todos os itens na
  mesma ordem (Principal → Operações → Cadastros → Relatórios)
- `sidebar.js` detecta a página ativa corretamente pelo URL em todas as páginas
- Dados fictícios zerados em `dashboard-comercial.html`, `financeiro.html`, `estoque.html`
- Botão "Importar" visível em todas as páginas
- Modal de importação abre com drag-and-drop e seleção de tipo de dado
- Links cruzados entre KPI cards (financeiro ↔ lancamentos, comercial ↔ estoque, etc.)
- URL tab routing em `lancamentos.html` (`?tab=ar`, `?tab=ap`)
- `auth.js` popula nome/iniciais do usuário após sidebar estar pronta

### O que está quebrado ❌
- **`dashboard-distribuidora.html`** — sidebar visualmente incorreta.

  **Causa raiz identificada:** O CSS nesse arquivo nunca foi convertido para o tema
  escuro. O `.sidebar` ainda tem `background: rgba(255,255,255,.85)` (branco/translúcido)
  em vez de `background: var(--accent)` (verde escuro). Como resultado:
  - `.sidebar-section { color: rgba(255,255,255,.45) }` → texto branco em fundo branco → **invisível**
  - `.nav-item.active { color: #fff }` → texto branco em fundo branco → **invisível**
  - "Dashboard" (item ativo) e "PRINCIPAL" (header de seção) somem
  - `.nav-item { color: var(--muted) }` → texto cinza visível mas com cor errada
  - `.logo-name { color: var(--text) }` → texto escuro (cor errada para sidebar escura)
  - `.u-name { color: var(--text) }` → texto escuro (cor errada)

  Os scripts `fix_sidebar.py` e `fix_sidebar2.py` da sessão anterior falharam neste
  arquivo porque o regex buscava `rgba(255,255,255,.9)` mas o arquivo usa `.85`.
  Além disso, havia uma linha extra `-webkit-backdrop-filter: blur(20px);` que
  quebrou o match.

### Dados fictícios remanescentes (não foram zerados ainda)
As páginas abaixo ainda podem ter valores hardcoded no HTML ou JS que precisam ser
zerrados. Não foram verificadas nesta sessão:
- `metas.html`
- `orcamentos.html`
- `fiscal.html`
- `fluxo-caixa.html`
- `logistica.html`
- `pedidos.html`
- `cadastros.html`
- `lancamentos.html`
- `estatistica-vendas.html`
- `dashboard-distribuidora.html` (além do bug de CSS)

---

## 5. Próximos passos

### Passo 1 — Fix urgente: CSS da sidebar em `dashboard-distribuidora.html`
Substituir o bloco CSS do sidebar no arquivo. O bloco começa em torno da linha 47
com `/* ===== SIDEBAR ===== */`. As substituições exatas são:

```python
# Script Python para rodar em c:\Users\Natgeo50\Documents\dashboardnatgeo
import re

path = r'c:\Users\Natgeo50\Documents\dashboardnatgeo\dashboard-distribuidora.html'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

fixes = [
    # Sidebar background
    ('background: rgba(255,255,255,.85);\n      backdrop-filter: blur(20px);\n      -webkit-backdrop-filter: blur(20px);\n      border-right: 1px solid var(--border);',
     'background: var(--accent);'),
    # logo-name color
    ('color: var(--text); }     .logo-name span', 'color: #fff; }     .logo-name span'),
    ('.logo-name { font-size: 1rem; font-weight: 700; letter-spacing: -.4px; color: var(--text); }',
     '.logo-name { font-size: 1rem; font-weight: 700; letter-spacing: -.4px; color: #fff; }'),
    # nav-item color
    ('color: var(--muted);\n      font-size: .86rem;',
     'color: rgba(255,255,255,.75);\n      font-size: .86rem;'),
    # u-name color
    ('.u-name { font-size: .82rem; font-weight: 600; color: var(--text); }',
     '.u-name { font-size: .82rem; font-weight: 600; color: #fff; }'),
    # u-role color
    ('.u-role { font-size: .72rem; color: var(--muted); }',
     '.u-role { font-size: .72rem; color: rgba(255,255,255,.55); }'),
    # logout-btn color
    ('.logout-btn { margin-left: auto; color: var(--muted2);',
     '.logout-btn { margin-left: auto; color: rgba(255,255,255,.55);'),
    # avatar background
    ('background: var(--accent); display: flex; align-items: center;\n      justify-content: center; font-weight: 600; font-size: .78rem;\n      color: #fff;',
     'background: rgba(255,255,255,.2); display: flex; align-items: center;\n      justify-content: center; font-weight: 600; font-size: .78rem;\n      color: #fff;'),
]

for old, new in fixes:
    if old in c:
        c = c.replace(old, new)
        print(f'FIXED: {old[:50]}...')
    else:
        print(f'NOT FOUND: {old[:50]}...')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('Done.')
```

> **Alternativa mais simples:** Substituir todo o bloco CSS do sidebar no arquivo
> por um CSS canônico igual ao de `financeiro.html` (que está correto). Fazer um
> copy-paste do bloco `.sidebar { ... }` até `.logout-btn:hover { ... }`.

### Passo 2 — Verificar e zerar dados fictícios nas demais páginas
Para cada página da lista de "remanescentes" acima, verificar se há:
- Valores hardcoded em elementos HTML (procurar por `kpi-value`, `kh-val`, `kpi-val`)
- Arrays de mock data em JS (procurar por `const DATA`, `const MOCK`, números grandes)
- Se encontrar, substituir valores HTML por `—` e arrays JS por `[]`

### Passo 3 — Aplicar migrations no Supabase
Todas as 8 migrations em `supabase/migrations/` precisam ser aplicadas no
Supabase Studio para que as tabelas e views existam. Só depois as APIs retornam
dados reais.

Ordem: `001_initial_schema.sql` → `002_...` → ... → `008_...`
Acessar: Supabase Studio → SQL Editor → rodar cada migration em ordem.

### Passo 4 — Implementar `/api/import` no backend
O modal de importação CSV já existe no frontend mas o endpoint não existe.
Criar em `src/api/server.ts`:
```typescript
app.post('/api/import', upload.single('file'), async (req, res) => {
  const { module } = req.body;
  const file = req.file;
  // parse CSV/XLSX, upsert no Supabase conforme o módulo
});
```
Usar `multer` para upload e `xlsx` ou `csv-parse` para leitura.

### Passo 5 — Commit e deploy após cada grupo de correções
```bash
cd "c:\Users\Natgeo50\Documents\dashboardnatgeo"
git add -A
git commit -m "fix: descrição do que foi corrigido"
git push origin main
# Aguardar build no Coolify (~3 min)
# Verificar em: http://byy6u6lkrgic5tca4vlhvgy8.177.7.43.206.sslip.io
# Usar Ctrl+Shift+R para forçar reload sem cache
```

---

## 6. Perguntas em aberto

1. **Quando as migrations serão aplicadas?** Sem isso, nenhuma API retorna dados reais
   e todos os dashboards ficam zerados (o que é o comportamento correto, mas não há
   como validar se os endpoints funcionam).

2. **As credenciais do Oracle ERP estão disponíveis?** O worker de sync está
   implementado mas não testado com dados reais. Há também um SQL Injection confirmado
   em `workers/oracle-sync/entities/sales-orders.sync.ts` linha ~66-85 que precisa
   ser corrigido antes de conectar o Oracle.

3. **O endpoint `/api/import` deve aceitar qual formato de CSV?** Existe um template
   para cada tipo de dado (clientes, produtos, etc.) ou o usuário importa no formato
   que tiver?

4. **Autenticação:** O sistema tem `login.html` funcional mas nenhum usuário cadastrado
   no Supabase. Será necessário criar um usuário manualmente no Supabase Auth para
   testar o fluxo completo.

5. **Domínio próprio?** Atualmente o app roda em `sslip.io` (IP dinâmico). O browser
   exibe "Inseguro". Se houver um domínio próprio, configurar SSL no Coolify.

---

## 7. Artefatos relevantes

### Arquivos-chave
| Arquivo | Descrição |
|---|---|
| `js/sidebar.js` | Sidebar canônica — injeta HTML em todas as páginas via DOMContentLoaded |
| `js/auth.js` | Gerenciamento de sessão — aguarda `sidebarReady` para popular usuário |
| `js/import.js` | Modal de importação CSV/Excel — drag-and-drop, envia para `/api/import` |
| `js/api.js` | Cliente HTTP para API Express — sem fallback para mocks |
| `src/api/server.ts` | Servidor Express — 14 endpoints, todos sem auth ainda |
| `supabase/migrations/` | 8 migrations SQL — NÃO aplicadas no banco ainda |
| `workers/oracle-sync/` | Worker de sync Oracle → Supabase |

### CSS canônico da sidebar (correto — usado em `financeiro.html`)
```css
.sidebar { width: var(--sidebar-w); background: var(--accent); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 200; overflow-y: auto; }
.sidebar-logo { height: var(--header-h); display: flex; align-items: center; gap: 10px; padding: 0 20px; border-bottom: 1px solid rgba(255,255,255,.1); flex-shrink: 0; }
.logo-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,.15); display: flex; align-items: center; justify-content: center; color: #fff; font-size: .85rem; }
.logo-name { font-size: 1rem; font-weight: 700; color: #fff; }
.logo-name span { color: #95d5b2; }
.sidebar-section { padding: 16px 16px 4px; font-size: .65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: rgba(255,255,255,.45); }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: var(--radius-sm); margin: 1px 8px; cursor: pointer; color: rgba(255,255,255,.75); font-size: .86rem; text-decoration: none; transition: all .15s; font-weight: 500; }
.nav-item i { width: 16px; text-align: center; font-size: .82rem; flex-shrink: 0; }
.nav-item:hover { background: rgba(255,255,255,.12); color: #fff; }
.nav-item.active { background: rgba(255,255,255,.18); color: #fff; font-weight: 600; }
.nav-item.active i { color: #fff; }
.sidebar-footer { margin-top: auto; border-top: 1px solid rgba(255,255,255,.1); padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: .78rem; color: #fff; flex-shrink: 0; }
.u-name { font-size: .82rem; font-weight: 600; color: #fff; }
.u-role { font-size: .72rem; color: rgba(255,255,255,.55); }
.logout-btn { margin-left: auto; color: rgba(255,255,255,.55); cursor: pointer; font-size: .82rem; transition: color .15s; }
.logout-btn:hover { color: #fff; }
```

### Sidebar HTML placeholder (igual em todas as páginas)
```html
<aside class="sidebar"></aside>
```
O `sidebar.js` injeta todo o conteúdo via JS. Não colocar nada dentro do `<aside>`.

### Ordem correta dos scripts em cada página
```html
<!-- No final do <body>, nesta ordem: -->
<script src="js/api.js"></script>
<script src="js/sidebar.js"></script>
<script src="js/auth.js"></script>
<!-- scripts específicos da página... -->
<script src="js/import.js"></script>
```

### Evento `sidebarReady`
`sidebar.js` dispara `document.dispatchEvent(new CustomEvent('sidebarReady'))` ao terminar.
`auth.js` escuta esse evento antes de preencher `#userInitials` e `#userName`.
Se precisar fazer algo após a sidebar estar pronta, use:
```javascript
document.addEventListener('sidebarReady', function() { /* seu código */ }, { once: true });
```

### Verificar sidebar CSS de um arquivo
```python
import re
with open('nome-do-arquivo.html', encoding='utf-8') as f: c = f.read()
m = re.search(r'\.sidebar\s*\{[^}]+\}', c)
print(m.group() if m else 'not found')
```

### Deploy
```bash
cd "c:\Users\Natgeo50\Documents\dashboardnatgeo"
git add arquivo.html js/arquivo.js
git commit -m "fix: descrição"
git push origin main
# Coolify rebuilda automaticamente — verificar aba Deployments no painel
```

---

## 8. Instruções para a próxima sessão

### Tom e abordagem
- O usuário quer um produto que pareça o **Bling ERP** — coeso, profissional, todos os
  módulos conectados. Priorize aparência e consistência visual antes de funcionalidade.
- Respostas em **português**.
- Seja direto: execute e mostre, não explique demais antes de fazer.
- O usuário aprova planos antes da execução em casos de mudanças grandes, mas para
  bugs óbvios pode ir direto.

### Armadilhas a evitar
1. **Não use scripts Python com `print()` contendo caracteres Unicode especiais** (→, ←,
   emojis) no Windows — causa `UnicodeEncodeError` no PowerShell com encoding cp1252.
   Use `Write-Host` no PowerShell ou escape os caracteres.

2. **Verificar SEMPRE a posição do `sidebar.js` relativa ao `<aside>`** antes de
   assumir que vai funcionar. Se sidebar.js vier antes do `<aside>` no HTML, vai
   retornar `null` e não injetar nada. Use `DOMContentLoaded` (já está implementado).

3. **O Docker build falha se o TypeScript tiver erro.** Antes de qualquer push que
   toque arquivos `.ts`, rodar `npx tsc --noEmit` no diretório para verificar.

4. **Não há fallback para mocks na API.** Se a API falhar (banco vazio), os dashboards
   mostram estado vazio — isso é correto e intencional. Não confundir com bug.

5. **As migrations do Supabase ainda não foram aplicadas.** Não tente testar endpoints
   de dados reais sem primeiro aplicar as migrations. O banco está vazio.

6. **`dashboard-distribuidora.html` tem CSS de sidebar diferente das outras páginas.**
   Especificamente o `.sidebar { background }` ainda é `rgba(255,255,255,.85)`.
   O primeiro passo da próxima sessão é corrigir isso.

7. **`git add -A` pode incluir os scripts Python temporários** (`fix_all.py`,
   `fix_zeros.py`, etc.). Adicionar apenas os arquivos necessários ou garantir que
   os `.py` não sejam commitados.

### Prioridade imediata
O único bug crítico visual restante é o CSS da sidebar em `dashboard-distribuidora.html`.
Começar por aí, verificar no Coolify, depois prosseguir com o zero de dados fictícios
nas demais páginas.
