import { test, expect } from '@playwright/test';
import { injectSession, attachAuditListeners, waitSidebar, shot, tryClick, checkClickable } from './helpers';

const PAGE = '/dashboard-comercial.html';

test.describe('Comercial (dashboard-comercial)', () => {

  test('carrega sem tela branca', async ({ page }) => {
    await injectSession(page);
    const log = attachAuditListeners(page);
    await page.goto(PAGE);
    await waitSidebar(page);
    await shot(page, '10-comercial-load');

    expect(page.url()).toContain('dashboard-comercial');
    const overlay = page.locator('#natgeo-access-overlay');
    await expect(overlay).toHaveCount(0);

    console.log('[comercial] api calls:', log.apiCalls.map(a => `${a.status} ${a.url}`));
    console.log('[comercial] console errors:', log.consoleErrors);
  });

  test('filtros de período — 1M 3M 6M 12M e range customizado', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    // Botões de período inline
    const periodBtns = page.locator('.period-btn, button[data-period], .filter-period button');
    const count = await periodBtns.count();
    console.log(`[comercial] botões de período: ${count}`);

    const results: Record<string, string> = {};
    for (let i = 0; i < Math.min(count, 5); i++) {
      const btn = periodBtns.nth(i);
      const label = (await btn.textContent())?.trim() || `btn${i}`;
      const isActive = await btn.evaluate(e => e.classList.contains('active'));
      const clickable = await btn.isEnabled();
      results[label] = `ativo=${isActive}, enabled=${clickable}`;
      try { await btn.click({ timeout: 2000 }); await page.waitForTimeout(200); } catch { /**/ }
    }
    console.log('[comercial] período:', results);
    await shot(page, '11-comercial-filters');
  });

  test('filtro de vendedor/equipe (subbar)', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const vendorSelect = page.locator('select[id*="vendor"], select[id*="team"], .subbar select').first();
    const hasVendorFilter = await vendorSelect.isVisible().catch(() => false);
    console.log(`[comercial] filtro vendedor/equipe: ${hasVendorFilter}`);

    if (hasVendorFilter) {
      const options = await vendorSelect.locator('option').allTextContents();
      console.log(`  opções: ${options.join(', ')}`);
      await shot(page, '12-comercial-vendor-filter');
    }
  });

  test('KPI cards — 4 principais', async ({ page }) => {
    await injectSession(page);
    const log = attachAuditListeners(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const kpis = page.locator('.kpi-card, .kh-card, .kpi-val, .kh-val');
    const count = await kpis.count();
    console.log(`[comercial] KPIs: ${count}`);

    for (let i = 0; i < Math.min(count, 6); i++) {
      const text = (await kpis.nth(i).textContent())?.replace(/\s+/g, ' ').trim().slice(0, 80);
      console.log(`  KPI[${i}]: "${text}"`);
    }
    await shot(page, '13-comercial-kpis');
    console.log('[comercial] api errors:', log.networkErrors);
  });

  test('gráficos Chart.js — canvas', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);
    await page.waitForTimeout(1200);

    const canvases = page.locator('canvas');
    const count = await canvases.count();
    console.log(`[comercial] canvas: ${count}`);

    for (let i = 0; i < count; i++) {
      const visible = await canvases.nth(i).isVisible();
      const { width, height } = await canvases.nth(i).boundingBox() || { width: 0, height: 0 };
      console.log(`  canvas[${i}]: visível=${visible}, ${Math.round(width)}x${Math.round(height)}`);
    }
    await shot(page, '14-comercial-charts');
  });

  test('tabela de clientes / top produtos — scroll e linhas', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const tables = page.locator('table, .table-wrap, [class*="table"]');
    const tableCount = await tables.count();
    console.log(`[comercial] tabelas encontradas: ${tableCount}`);

    for (let i = 0; i < Math.min(tableCount, 3); i++) {
      const rows = await tables.nth(i).locator('tr').count();
      console.log(`  tabela[${i}]: ${rows} linhas`);
    }

    // Estado vazio amigável
    const emptyState = page.locator('.empty-state, [class*="empty"], .no-data');
    const emptyCount = await emptyState.count();
    console.log(`[comercial] estados vazios: ${emptyCount}`);
    await shot(page, '15-comercial-tables');
  });

  test('drill-down inputs — campos de busca e selects', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const inputs = page.locator('input:not([type="hidden"]), select');
    const count = await inputs.count();
    console.log(`[comercial] inputs/selects: ${count}`);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const tag = await inputs.nth(i).evaluate(e => e.tagName.toLowerCase());
      const type = await inputs.nth(i).getAttribute('type') || 'text';
      const placeholder = await inputs.nth(i).getAttribute('placeholder') || '';
      const visible = await inputs.nth(i).isVisible();
      console.log(`  input[${i}]: <${tag} type="${type}"> placeholder="${placeholder}" visível=${visible}`);
    }
  });

  test('progress bars — renderizadas', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const bars = page.locator('.progress, .progress-bar, [class*="bar"]');
    const count = await bars.count();
    console.log(`[comercial] barras de progresso: ${count}`);
    await shot(page, '16-comercial-bars');
  });

  test('YoY badge — presente', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const yoy = page.locator('.yoy, [class*="yoy"], .badge:has-text("YoY")');
    const count = await yoy.count();
    console.log(`[comercial] YoY badges: ${count}`);
  });

  test('botão Importar — abre modal', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const importBtn = page.locator('button:has-text("Importar"), .import-btn').first();
    const exists = await importBtn.isVisible().catch(() => false);
    if (exists) {
      await importBtn.click();
      await page.waitForTimeout(400);
      await shot(page, '17-comercial-import-modal');
    }
    console.log(`[comercial] botão Importar: ${exists}`);
  });

  test('API calls — quais endpoints são chamados', async ({ page }) => {
    await injectSession(page);
    const log = attachAuditListeners(page);
    await page.goto(PAGE);
    await waitSidebar(page);
    await page.waitForTimeout(2000); // aguarda chamadas assíncronas

    console.log('[comercial] todas API calls:');
    for (const call of log.apiCalls) {
      console.log(`  ${call.status} ${call.url}`);
    }
    console.log('[comercial] erros de rede:');
    for (const err of log.networkErrors) {
      console.log(`  ${err.status} ${err.url}`);
    }
  });
});
