import { test, expect } from '@playwright/test';
import { injectSession, attachAuditListeners, waitSidebar, shot, checkClickable } from './helpers';

const PAGE = '/financeiro.html';

test.describe('Financeiro', () => {

  test('carrega sem tela branca', async ({ page }) => {
    await injectSession(page);
    const log = attachAuditListeners(page);
    await page.goto(PAGE);
    await waitSidebar(page);
    await shot(page, '20-financeiro-load');

    expect(page.url()).toContain('financeiro');
    const overlay = page.locator('#natgeo-access-overlay');
    await expect(overlay).toHaveCount(0);

    console.log('[financeiro] api calls:', log.apiCalls.map(a => `${a.status} ${a.url}`));
    console.log('[financeiro] console errors:', log.consoleErrors);
  });

  test('KPI header — 6 cards em sticky', async ({ page }) => {
    await injectSession(page);
    const log = attachAuditListeners(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const kpis = page.locator('.kpi-card, .kh-card');
    const count = await kpis.count();
    console.log(`[financeiro] KPI cards: ${count}`);

    for (let i = 0; i < Math.min(count, 8); i++) {
      const text = await kpis.nth(i).textContent({ timeout: 1000 }).catch(() => '?');
      console.log(`  KPI[${i}]: "${text?.replace(/\s+/g, ' ').trim().slice(0, 60)}"`);
    }

    await shot(page, '21-financeiro-kpis');
    console.log('[financeiro] api errors:', log.networkErrors.map(e => `${e.status} ${e.url}`));
  });

  test('filtros de período — funcionam', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const periodBtns = page.locator('.period-btn, button[data-period]');
    const count = await periodBtns.count();
    console.log(`[financeiro] filtros de período: ${count}`);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const label = (await periodBtns.nth(i).textContent())?.trim();
      try {
        await periodBtns.nth(i).click({ timeout: 2000 });
        await page.waitForTimeout(300);
        console.log(`  "${label}" — clicado OK`);
      } catch {
        console.log(`  "${label}" — falhou ao clicar`);
      }
    }
    await shot(page, '22-financeiro-period-filter');
  });

  test('select de unidade/empresa', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const selects = page.locator('select');
    const count = await selects.count();
    console.log(`[financeiro] selects: ${count}`);

    for (let i = 0; i < count; i++) {
      const options = await selects.nth(i).locator('option').allTextContents();
      const id = await selects.nth(i).getAttribute('id') || `select${i}`;
      console.log(`  select#${id}: [${options.join(', ')}]`);
    }
  });

  test('abas internas (tabs) — clicáveis', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const tabs = page.locator('.tab, .tab-btn, [role="tab"], .bloco-nav .nav-item, .bloco-tab');
    const count = await tabs.count();
    console.log(`[financeiro] abas internas: ${count}`);

    for (let i = 0; i < Math.min(count, 8); i++) {
      const label = (await tabs.nth(i).textContent())?.trim().slice(0, 30);
      const clickable = await tabs.nth(i).isEnabled().catch(() => false);
      console.log(`  aba[${i}] "${label}": clicável=${clickable}`);
      try {
        await tabs.nth(i).click({ timeout: 2000 });
        await page.waitForTimeout(300);
      } catch { /* continua */ }
    }
    await shot(page, '23-financeiro-tabs');
  });

  test('links cruzados nos KPI cards (→ lancamentos)', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const crossLinks = page.locator('.kpi-card a[href*="lancamentos"], a[href*="lancamentos"]');
    const count = await crossLinks.count();
    console.log(`[financeiro] links para lancamentos.html: ${count}`);

    for (let i = 0; i < count; i++) {
      const href = await crossLinks.nth(i).getAttribute('href');
      const text = (await crossLinks.nth(i).textContent())?.trim().slice(0, 40);
      console.log(`  "${text}" → ${href}`);
    }
  });

  test('gráficos Chart.js', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);
    await page.waitForTimeout(1200);

    const canvases = page.locator('canvas');
    const count = await canvases.count();
    console.log(`[financeiro] canvas: ${count}`);

    for (let i = 0; i < count; i++) {
      const bb = await canvases.nth(i).boundingBox() || { width: 0, height: 0 };
      const visible = await canvases.nth(i).isVisible();
      console.log(`  canvas[${i}]: ${Math.round(bb.width)}x${Math.round(bb.height)}, visível=${visible}`);
    }
    await shot(page, '24-financeiro-charts');
  });

  test('tabelas — linhas e estado vazio', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const tables = page.locator('table');
    const count = await tables.count();
    console.log(`[financeiro] tabelas: ${count}`);

    for (let i = 0; i < Math.min(count, 4); i++) {
      const rows = await tables.nth(i).locator('tbody tr').count();
      const headers = (await tables.nth(i).locator('th').allTextContents()).join(' | ');
      console.log(`  tabela[${i}]: ${rows} linhas — headers: "${headers.slice(0, 80)}"`);
    }

    const emptyStates = page.locator('.empty-state, [class*="empty"], .no-data, td:has-text("Nenhum")');
    const emptyCount = await emptyStates.count();
    console.log(`[financeiro] estados vazios visíveis: ${emptyCount}`);
    await shot(page, '25-financeiro-tables');
  });

  test('botões de ação (+ Novo, Exportar, Filtrar)', async ({ page }) => {
    await injectSession(page);
    const log = attachAuditListeners(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const actionBtns = page.locator('button:has-text("Novo"), button:has-text("Exportar"), button:has-text("Filtrar"), button:has-text("Adicionar")');
    const count = await actionBtns.count();
    console.log(`[financeiro] botões de ação: ${count}`);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const label = (await actionBtns.nth(i).textContent())?.trim();
      const enabled = await actionBtns.nth(i).isEnabled();
      console.log(`  "${label}": enabled=${enabled}`);
      if (enabled) {
        try {
          await actionBtns.nth(i).click({ timeout: 2000 });
          await page.waitForTimeout(400);
          console.log(`    → clicado, api calls após: ${log.apiCalls.length}`);
          await shot(page, `26-financeiro-btn-${i}`);
          // Fecha modais abertos
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        } catch { /* continua */ }
      }
    }
  });

  test('semáforos e pills de status', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const semaforos = page.locator('.semaforo, .status-pill, .pill, .badge');
    const count = await semaforos.count();
    console.log(`[financeiro] semáforos/pills/badges: ${count}`);

    const texts = await semaforos.allTextContents();
    console.log(`  valores: ${texts.slice(0, 10).join(', ')}`);
  });

  test('API calls — todos os endpoints chamados', async ({ page }) => {
    await injectSession(page);
    const log = attachAuditListeners(page);
    await page.goto(PAGE);
    await waitSidebar(page);
    await page.waitForTimeout(2000);

    console.log('[financeiro] endpoints chamados:');
    for (const call of log.apiCalls) {
      const label = call.status >= 400 ? 'ERRO' : 'ok';
      console.log(`  [${label}] ${call.status} ${call.url}`);
    }
  });
});
