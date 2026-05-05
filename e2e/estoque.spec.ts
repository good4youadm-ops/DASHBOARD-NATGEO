import { test, expect } from '@playwright/test';
import { injectSession, attachAuditListeners, waitSidebar, shot, checkClickable } from './helpers';

const PAGE = '/estoque.html';

test.describe('Estoque', () => {

  test('carrega sem tela branca', async ({ page }) => {
    await injectSession(page);
    const log = attachAuditListeners(page);
    await page.goto(PAGE);
    await waitSidebar(page);
    await shot(page, '30-estoque-load');

    expect(page.url()).toContain('estoque');
    const overlay = page.locator('#natgeo-access-overlay');
    await expect(overlay).toHaveCount(0);

    console.log('[estoque] api calls:', log.apiCalls.map(a => `${a.status} ${a.url}`));
    console.log('[estoque] console errors:', log.consoleErrors);
  });

  test('KPI header — indicadores operacionais', async ({ page }) => {
    await injectSession(page);
    const log = attachAuditListeners(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const kpis = page.locator('.kpi-card, .kh-card');
    const count = await kpis.count();
    console.log(`[estoque] KPI cards: ${count}`);

    for (let i = 0; i < Math.min(count, 8); i++) {
      const text = await kpis.nth(i).textContent({ timeout: 1000 }).catch(() => '?');
      console.log(`  KPI[${i}]: "${text?.replace(/\s+/g, ' ').trim().slice(0, 60)}"`);
    }

    await shot(page, '31-estoque-kpis');
    console.log('[estoque] api errors:', log.networkErrors.map(e => `${e.status} ${e.url}`));
  });

  test('abas: Disponibilidade, Validade & Lotes, Cobertura, Movimentação, Necessidade de Compra', async ({ page }) => {
    await injectSession(page);
    const log = attachAuditListeners(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const expectedTabs = [
      'Disponibilidade',
      'Validade',
      'Cobertura',
      'Movimentação',
      'Necessidade',
      'Lotes',
    ];

    const tabs = page.locator('.tab, .tab-btn, .bloco-nav a, [role="tab"]');
    const tabCount = await tabs.count();
    console.log(`[estoque] abas encontradas: ${tabCount}`);

    for (let i = 0; i < tabCount; i++) {
      const label = (await tabs.nth(i).textContent())?.trim().slice(0, 40);
      const href = await tabs.nth(i).getAttribute('href') || await tabs.nth(i).getAttribute('data-tab') || '';
      const clickable = await tabs.nth(i).isEnabled().catch(() => false);
      console.log(`  aba[${i}]: "${label}" → "${href}" clicável=${clickable}`);

      try {
        await tabs.nth(i).click({ timeout: 2000 });
        await page.waitForTimeout(500);
        const apiCallsBefore = log.apiCalls.length;
        await page.waitForTimeout(500);
        const newCalls = log.apiCalls.slice(apiCallsBefore);
        if (newCalls.length > 0) {
          console.log(`    dispara API: ${newCalls.map(c => `${c.status} ${c.url.split('/api/')[1]}`).join(', ')}`);
        }
        await shot(page, `32-estoque-tab-${i}`);
      } catch {
        console.log(`    → falhou ao clicar`);
      }
    }
  });

  test('filtros de período e select de produto/categoria', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const periodBtns = page.locator('.period-btn, button[data-period]');
    const pCount = await periodBtns.count();
    console.log(`[estoque] botões de período: ${pCount}`);

    const selects = page.locator('select');
    const sCount = await selects.count();
    console.log(`[estoque] selects: ${sCount}`);

    for (let i = 0; i < sCount; i++) {
      const id = await selects.nth(i).getAttribute('id') || `select${i}`;
      const opts = await selects.nth(i).locator('option').allTextContents();
      console.log(`  select#${id}: ${opts.slice(0, 5).join(', ')}`);
    }

    for (let i = 0; i < Math.min(pCount, 4); i++) {
      const label = (await periodBtns.nth(i).textContent())?.trim();
      try { await periodBtns.nth(i).click({ timeout: 2000 }); } catch { /**/ }
      console.log(`  período "${label}" clicado`);
    }

    await shot(page, '33-estoque-filters');
  });

  test('gráficos Chart.js — canvas por aba', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);
    await page.waitForTimeout(1200);

    const canvases = page.locator('canvas');
    const count = await canvases.count();
    console.log(`[estoque] canvas total: ${count}`);

    for (let i = 0; i < count; i++) {
      const bb = await canvases.nth(i).boundingBox() || { width: 0, height: 0 };
      const visible = await canvases.nth(i).isVisible();
      console.log(`  canvas[${i}]: ${Math.round(bb.width)}x${Math.round(bb.height)}, visível=${visible}`);
    }
    await shot(page, '34-estoque-charts');
  });

  test('tabelas de estoque — headers e linhas', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const tables = page.locator('table');
    const count = await tables.count();
    console.log(`[estoque] tabelas: ${count}`);

    for (let i = 0; i < Math.min(count, 4); i++) {
      const rows = await tables.nth(i).locator('tbody tr').count();
      const headers = (await tables.nth(i).locator('th').allTextContents()).map(h => h.trim()).join(' | ');
      console.log(`  tabela[${i}]: ${rows} linhas — "${headers.slice(0, 100)}"`);
    }

    const emptyStates = page.locator('.empty-state, [class*="empty"], .no-data');
    console.log(`[estoque] estados vazios: ${await emptyStates.count()}`);
    await shot(page, '35-estoque-tables');
  });

  test('botões de ação — Registrar Contagem, Solicitar Compra, Exportar', async ({ page }) => {
    await injectSession(page);
    const log = attachAuditListeners(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const actionBtns = page.locator([
      'button:has-text("Registrar")',
      'button:has-text("Solicitar")',
      'button:has-text("Exportar")',
      'button:has-text("Novo")',
      'button:has-text("Compra")',
      'button:has-text("Movimentação")',
    ].join(', '));

    const count = await actionBtns.count();
    console.log(`[estoque] botões de ação: ${count}`);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const label = (await actionBtns.nth(i).textContent())?.trim();
      const enabled = await actionBtns.nth(i).isEnabled();
      console.log(`  "${label}": enabled=${enabled}`);
      if (enabled) {
        try {
          await actionBtns.nth(i).click({ timeout: 2000 });
          await page.waitForTimeout(400);
          await shot(page, `36-estoque-btn-${i}`);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        } catch { /**/ }
      }
    }
  });

  test('semáforos de estoque (verde/vermelho/amarelo)', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const semaforos = page.locator('.semaforo, .semaforo-green, .semaforo-red, .semaforo-amber, [class*="semaforo"]');
    const count = await semaforos.count();
    console.log(`[estoque] semáforos: ${count}`);

    const pills = page.locator('.pill, .badge, .status-pill');
    const pillCount = await pills.count();
    console.log(`[estoque] pills/badges: ${pillCount}`);
    const pillTexts = await pills.allTextContents();
    console.log(`  valores: ${pillTexts.slice(0, 8).join(', ')}`);
  });

  test('busca / filtro de produto na tabela', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const searchInputs = page.locator('input[type="search"], input[placeholder*="busca"], input[placeholder*="produto"], input[placeholder*="SKU"], .search-box input');
    const count = await searchInputs.count();
    console.log(`[estoque] campos de busca: ${count}`);

    for (let i = 0; i < count; i++) {
      const placeholder = await searchInputs.nth(i).getAttribute('placeholder') || '';
      const visible = await searchInputs.nth(i).isVisible();
      console.log(`  busca[${i}]: placeholder="${placeholder}", visível=${visible}`);
      if (visible) {
        await searchInputs.nth(i).fill('produto teste');
        await page.waitForTimeout(400);
        await shot(page, `37-estoque-search-${i}`);
        await searchInputs.nth(i).fill('');
      }
    }
  });

  test('paginação das tabelas', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const pagination = page.locator('.pagination, [class*="pag"], button:has-text("Próximo"), button:has-text("Anterior"), button:has-text(">>")');
    const count = await pagination.count();
    console.log(`[estoque] elementos de paginação: ${count}`);
  });

  test('API calls completas — todos endpoints', async ({ page }) => {
    await injectSession(page);
    const log = attachAuditListeners(page);
    await page.goto(PAGE);
    await waitSidebar(page);
    await page.waitForTimeout(2500);

    console.log('[estoque] endpoints chamados:');
    for (const call of log.apiCalls) {
      const label = call.status >= 400 ? 'ERRO' : 'ok';
      console.log(`  [${label}] ${call.status} ${call.url}`);
    }
    console.log(`[estoque] total: ${log.apiCalls.length} chamadas, ${log.networkErrors.length} erros`);
  });
});
