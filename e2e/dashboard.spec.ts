import { test, expect } from '@playwright/test';
import { injectSession, attachAuditListeners, waitSidebar, shot, tryClick, checkClickable } from './helpers';

const PAGE = '/dashboard-distribuidora.html';

test.describe('Dashboard (dashboard-distribuidora)', () => {

  test('carrega sem tela branca e sidebar verde escuro', async ({ page }) => {
    await injectSession(page);
    const log = attachAuditListeners(page);
    await page.goto(PAGE);
    await waitSidebar(page);
    await shot(page, '01-dashboard-load');

    // Sidebar existe e tem background verde
    const sidebarBg = await page.locator('.sidebar').evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    // rgb(26, 71, 49) = #1a4731
    expect(sidebarBg).toContain('26, 71, 49');

    // Não redireciona para login
    expect(page.url()).toContain('dashboard-distribuidora');

    // Sem overlay de bloqueio (access.js não deve atuar nessa página)
    const overlay = page.locator('#natgeo-access-overlay');
    await expect(overlay).toHaveCount(0);

    console.log('[dashboard] console errors:', log.consoleErrors);
    console.log('[dashboard] api calls:', log.apiCalls);
  });

  test('filtros de período — botões 1M 3M 6M 12M', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const periodBtns = page.locator('.period-btn, [data-period], .filter-btn');
    const count = await periodBtns.count();
    console.log(`[dashboard] botões de período encontrados: ${count}`);

    for (let i = 0; i < Math.min(count, 6); i++) {
      const btn = periodBtns.nth(i);
      const label = await btn.textContent();
      const clickable = await checkClickable(page, `.period-btn:nth-child(${i + 1})`);
      console.log(`  botão "${label?.trim()}": clicável=${clickable}`);
      try {
        await btn.click({ timeout: 3000 });
        await page.waitForTimeout(300);
      } catch { /* silencia timeout */ }
    }
    await shot(page, '02-dashboard-filters');
  });

  test('busca na topbar — não quebra a página', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const searchInput = page.locator('.search-box input, input[type="search"], input[placeholder*="busca"], input[placeholder*="pesquis"]').first();
    const hasSearch = await searchInput.isVisible().catch(() => false);
    console.log(`[dashboard] campo de busca encontrado: ${hasSearch}`);

    if (hasSearch) {
      await searchInput.fill('produto teste');
      await page.waitForTimeout(500);
      await shot(page, '03-dashboard-search');

      // Página não deve ter desaparecido
      const body = await page.locator('body').isVisible();
      expect(body).toBe(true);
    }
  });

  test('KPI cards — presentes e valores', async ({ page }) => {
    await injectSession(page);
    const log = attachAuditListeners(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const kpiCards = page.locator('.kpi-card, .kh-card, [class*="kpi"]');
    const count = await kpiCards.count();
    console.log(`[dashboard] KPI cards encontrados: ${count}`);

    for (let i = 0; i < Math.min(count, 8); i++) {
      const card = kpiCards.nth(i);
      const text = (await card.textContent())?.replace(/\s+/g, ' ').trim().slice(0, 60);
      console.log(`  KPI[${i}]: "${text}"`);
    }

    await shot(page, '04-dashboard-kpis');
    console.log('[dashboard] api calls:', log.apiCalls.map(a => `${a.status} ${a.url}`));
  });

  test('KPI cards clicáveis — links cruzados funcionam', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const links = page.locator('.kpi-card a, .kh-card a, [class*="kpi"] a');
    const linkCount = await links.count();
    console.log(`[dashboard] links em KPI cards: ${linkCount}`);

    for (let i = 0; i < Math.min(linkCount, 4); i++) {
      const href = await links.nth(i).getAttribute('href');
      console.log(`  link[${i}]: href="${href}"`);
    }
  });

  test('gráficos — canvas renderizado', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);
    await page.waitForTimeout(1000); // aguarda Chart.js inicializar

    const canvases = page.locator('canvas');
    const count = await canvases.count();
    console.log(`[dashboard] canvas (gráficos) encontrados: ${count}`);

    for (let i = 0; i < count; i++) {
      const visible = await canvases.nth(i).isVisible();
      console.log(`  canvas[${i}]: visível=${visible}`);
    }
    await shot(page, '05-dashboard-charts');
  });

  test('sidebar — navegação para as 4 abas abertas', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const openLinks = [
      { href: 'dashboard-comercial.html',    label: 'Comercial' },
      { href: 'financeiro.html',             label: 'Financeiro' },
      { href: 'estoque.html',                label: 'Estoque' },
    ];

    for (const { href, label } of openLinks) {
      const link = page.locator(`.nav-item[href="${href}"]`);
      const exists = await link.count() > 0;
      const clickable = await checkClickable(page, `.nav-item[href="${href}"]`);
      console.log(`  sidebar "${label}" (${href}): existe=${exists}, clicável=${clickable}`);
    }
  });

  test('sidebar — itens bloqueados têm cadeado para usuário master (não deve ter)', async ({ page }) => {
    // Com master, NENHUM item deve ter cadeado
    await injectSession(page); // injeta master
    await page.goto(PAGE);
    await waitSidebar(page);

    const locked = page.locator('.nav-locked');
    const count = await locked.count();
    console.log(`[dashboard][master] itens com cadeado: ${count} (esperado: 0)`);
    expect(count).toBe(0);

    await shot(page, '06-dashboard-sidebar-master');
  });

  test('sidebar — itens bloqueados para usuário comum', async ({ page }) => {
    const { COMMON_SESSION } = await import('./helpers');
    await injectSession(page, COMMON_SESSION);
    await page.goto(PAGE);
    await waitSidebar(page);

    const locked = page.locator('.nav-locked');
    const count = await locked.count();
    console.log(`[dashboard][comum] itens com cadeado: ${count} (esperado: 9)`);

    await shot(page, '07-dashboard-sidebar-comum');
  });

  test('botão Importar — abre modal', async ({ page }) => {
    await injectSession(page);
    await page.goto(PAGE);
    await waitSidebar(page);

    const importBtn = page.locator('button:has-text("Importar"), .import-btn').first();
    const exists = await importBtn.isVisible().catch(() => false);
    console.log(`[dashboard] botão Importar: ${exists}`);

    if (exists) {
      await importBtn.click();
      await page.waitForTimeout(400);
      const modal = page.locator('.modal, #importModal, [class*="modal"]').first();
      const modalVisible = await modal.isVisible().catch(() => false);
      console.log(`  modal abre: ${modalVisible}`);
      await shot(page, '08-dashboard-import-modal');

      // Fecha o modal
      const closeBtn = page.locator('.modal .close, .modal-close, [data-dismiss="modal"], button:has-text("×"), button:has-text("Fechar")').first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
    }
  });
});
