/**
 * Utilitários compartilhados pelos testes E2E.
 */
import { Page, expect } from '@playwright/test';
import path from 'path';
import fs   from 'fs';

// ── Sessão fake (master) ──────────────────────────────────────────────────────
// Injeta um token com expiração futura para que auth.js não redirecione para login.
// O access_token é inválido no Supabase real, então chamadas à API falham com 401/500
// — exatamente o que queremos auditar.

export const MASTER_SESSION = {
  access_token:  'audit-fake-token',
  refresh_token: 'audit-fake-refresh',
  expires_at:    Math.floor(Date.now() / 1000) + 7200, // 2h no futuro
  user: {
    id:    'audit-user-id',
    email: 'ferrerjoao2206@gmail.com',
    user_metadata: { full_name: 'João Ferrer (Audit)' },
  },
};

export const COMMON_SESSION = {
  ...MASTER_SESSION,
  user: {
    ...MASTER_SESSION.user,
    email: 'comum@teste.com',
    user_metadata: { full_name: 'Usuário Comum' },
  },
};

/** Injeta a sessão no localStorage antes de navegar para a página. */
export async function injectSession(page: Page, session = MASTER_SESSION) {
  await page.addInitScript((s) => {
    localStorage.setItem('natgeo_auth', JSON.stringify(s));
  }, session);
}

// ── Coleta de erros de console / rede ────────────────────────────────────────
export interface AuditLog {
  consoleErrors: string[];
  networkErrors: { url: string; status: number }[];
  apiCalls:      { url: string; status: number }[];
}

export function attachAuditListeners(page: Page): AuditLog {
  const log: AuditLog = { consoleErrors: [], networkErrors: [], apiCalls: [] };

  page.on('console', (msg) => {
    if (msg.type() === 'error') log.consoleErrors.push(msg.text());
  });

  page.on('response', (res) => {
    const url = res.url();
    const status = res.status();
    if (url.includes('/api/')) {
      log.apiCalls.push({ url, status });
      if (status >= 400) log.networkErrors.push({ url, status });
    }
  });

  return log;
}

// ── Screenshot helper ─────────────────────────────────────────────────────────
const SHOTS_DIR = path.resolve('e2e', 'screenshots');
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

export async function shot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SHOTS_DIR, `${name}.png`),
    fullPage: false,
  });
}

// ── Helpers genéricos ─────────────────────────────────────────────────────────
/** Aguarda a sidebar carregar (sidebarReady é disparado pelo sidebar.js). */
export async function waitSidebar(page: Page) {
  await page.waitForSelector('.sidebar-logo', { timeout: 8000 });
}

/** Verifica se um elemento é clicável (visível, enabled, sem pointer-events:none). */
export async function checkClickable(page: Page, selector: string): Promise<boolean> {
  try {
    const el = page.locator(selector).first();
    const visible = await el.isVisible();
    const enabled = await el.isEnabled();
    if (!visible || !enabled) return false;
    const pe = await el.evaluate((e) => getComputedStyle(e).pointerEvents);
    return pe !== 'none';
  } catch {
    return false;
  }
}

/** Tenta clicar num elemento e retorna se funcionou sem exceção. */
export async function tryClick(page: Page, selector: string): Promise<'ok' | 'not_found' | 'error'> {
  try {
    const el = page.locator(selector).first();
    if (!(await el.isVisible())) return 'not_found';
    await el.click({ timeout: 4000 });
    return 'ok';
  } catch (e: unknown) {
    return (e instanceof Error && e.message.includes('not found')) ? 'not_found' : 'error';
  }
}
