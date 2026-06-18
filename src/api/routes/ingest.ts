import { Router } from 'express';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../logger';
import { getSupabase, defaultTenantId } from '../../lib/supabase';
import { mapProduct } from '../../mappings/products.mapping';
import { mapCustomer } from '../../mappings/customers.mapping';
import { mapSalesOrder, mapSalesOrderItem } from '../../mappings/sales-orders.mapping';
import { mapStockPosition, mapStockLot } from '../../mappings/inventory.mapping';
import { mapAccountReceivable, mapAccountPayable } from '../../mappings/finance.mapping';

const router = Router();
const CHUNK_SIZE = 500;
const SOURCE = 'push_api';

// ── Utilitários ───────────────────────────────────────────────────────────────

async function upsertBatch(sb: SupabaseClient, table: string, rows: Record<string, unknown>[]) {
  let upserted = 0, failed = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await sb.from(table).upsert(chunk, {
      onConflict: 'tenant_id,source_system,source_id',
      ignoreDuplicates: false,
    });
    if (error) {
      logger.error(`upsert ${table} falhou`, { error: error.message });
      failed += chunk.length;
    } else {
      upserted += chunk.length;
    }
  }
  return { upserted, failed };
}

// Resolve source_id → UUID para FK lookup (ex: customer_source_id → customer_id)
async function resolveIds(
  sb: SupabaseClient,
  table: string,
  tid: string,
  sourceIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(sourceIds.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const { data } = await sb
    .from(table)
    .select('source_id, id')
    .eq('tenant_id', tid)
    .in('source_id', unique);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.source_id && row.id) map.set(String(row.source_id), String(row.id));
  }
  return map;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ── Produtos ──────────────────────────────────────────────────────────────────
router.post('/api/ingest/products/batch', async (req, res) => {
  const b = z.object({
    records: z.array(z.record(z.unknown())).min(1).max(2000),
  }).safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'records[] obrigatório (máx 2000)' }); return; }

  try {
    const sb = getSupabase();
    const tid = defaultTenantId();
    const mapped = b.data.records.map(r => mapProduct(r, tid, SOURCE));
    const result = await upsertBatch(sb, 'products', mapped);
    logger.info('Ingest products/batch', { received: b.data.records.length, ...result });
    res.json({ received: b.data.records.length, ...result });
  } catch (e) {
    logger.error('POST /api/ingest/products/batch', { error: errMsg(e) });
    res.status(500).json({ error: errMsg(e) });
  }
});

// ── Clientes ──────────────────────────────────────────────────────────────────
router.post('/api/ingest/customers/batch', async (req, res) => {
  const b = z.object({
    records: z.array(z.record(z.unknown())).min(1).max(2000),
  }).safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'records[] obrigatório (máx 2000)' }); return; }

  try {
    const sb = getSupabase();
    const tid = defaultTenantId();
    const mapped = b.data.records.map(r => mapCustomer(r, tid, SOURCE));
    const result = await upsertBatch(sb, 'customers', mapped);
    logger.info('Ingest customers/batch', { received: b.data.records.length, ...result });
    res.json({ received: b.data.records.length, ...result });
  } catch (e) {
    logger.error('POST /api/ingest/customers/batch', { error: errMsg(e) });
    res.status(500).json({ error: errMsg(e) });
  }
});

// ── Pedidos de Venda ──────────────────────────────────────────────────────────
// ORDEM de envio importa: clientes e produtos devem ser enviados ANTES dos pedidos
// para que os FKs (customer_id, product_id) sejam resolvidos corretamente.
router.post('/api/ingest/sales-orders/batch', async (req, res) => {
  const b = z.object({
    orders: z.array(z.record(z.unknown())).min(1).max(2000),
    items:  z.array(z.record(z.unknown())).max(10000).optional().default([]),
  }).safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: 'orders[] obrigatório (máx 2000); items[] opcional (máx 10000)', details: b.error.flatten() });
    return;
  }

  try {
    const sb = getSupabase();
    const tid = defaultTenantId();

    // Resolve customer_id FK: precisa que clientes já tenham sido enviados antes
    const customerSourceIds = b.data.orders
      .map(r => String(r['CUSTOMER_SOURCE_ID'] ?? '')).filter(Boolean);
    const customerMap = await resolveIds(sb, 'customers', tid, customerSourceIds);

    const mappedOrders = b.data.orders.map(r => ({
      ...mapSalesOrder(r, tid, SOURCE),
      customer_id: customerMap.get(String(r['CUSTOMER_SOURCE_ID'] ?? '')) ?? null,
    }));
    const ordersResult = await upsertBatch(sb, 'sales_orders', mappedOrders);

    let itemsResult = { upserted: 0, failed: 0 };
    if (b.data.items.length > 0) {
      // Resolve sales_order_id e product_id FKs para os itens
      const orderSourceIds = b.data.orders.map(r => String(r['SOURCE_ID'] ?? '')).filter(Boolean);
      const [orderMap, productMap] = await Promise.all([
        resolveIds(sb, 'sales_orders', tid, orderSourceIds),
        resolveIds(sb, 'products', tid,
          b.data.items.map(r => String(r['PRODUCT_SOURCE_ID'] ?? '')).filter(Boolean)),
      ]);

      const mappedItems = b.data.items.map(r => ({
        ...mapSalesOrderItem(r, tid, SOURCE),
        sales_order_id: orderMap.get(String(r['ORDER_SOURCE_ID'] ?? '')) ?? null,
        product_id: productMap.get(String(r['PRODUCT_SOURCE_ID'] ?? '')) ?? null,
      }));
      itemsResult = await upsertBatch(sb, 'sales_order_items', mappedItems);
    }

    logger.info('Ingest sales-orders/batch', { orders: ordersResult, items: itemsResult });
    res.json({
      orders: { received: b.data.orders.length, ...ordersResult },
      items:  { received: b.data.items.length,  ...itemsResult  },
    });
  } catch (e) {
    logger.error('POST /api/ingest/sales-orders/batch', { error: errMsg(e) });
    res.status(500).json({ error: errMsg(e) });
  }
});

// ── Estoque (Posições + Lotes) ────────────────────────────────────────────────
// Envie produtos ANTES do estoque para que product_id seja resolvido corretamente.
router.post('/api/ingest/inventory/batch', async (req, res) => {
  const b = z.object({
    positions: z.array(z.record(z.unknown())).max(2000).optional().default([]),
    lots:      z.array(z.record(z.unknown())).max(5000).optional().default([]),
  }).refine(d => d.positions.length + d.lots.length > 0, {
    message: 'Envie ao menos positions[] ou lots[]',
  }).safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: 'positions[] ou lots[] obrigatório' });
    return;
  }

  try {
    const sb = getSupabase();
    const tid = defaultTenantId();

    // Resolve product_id FK para posições e lotes
    const productSourceIds = [
      ...b.data.positions.map(r => String(r['PRODUCT_SOURCE_ID'] ?? '')),
      ...b.data.lots.map(r => String(r['PRODUCT_SOURCE_ID'] ?? '')),
    ].filter(Boolean);
    const productMap = await resolveIds(sb, 'products', tid, productSourceIds);

    const posResult = b.data.positions.length > 0
      ? await upsertBatch(sb, 'stock_positions', b.data.positions.map(r => ({
          ...mapStockPosition(r, tid, SOURCE),
          product_id: productMap.get(String(r['PRODUCT_SOURCE_ID'] ?? '')) ?? null,
        })))
      : { upserted: 0, failed: 0 };

    const lotsResult = b.data.lots.length > 0
      ? await upsertBatch(sb, 'stock_lots', b.data.lots.map(r => ({
          ...mapStockLot(r, tid, SOURCE),
          product_id: productMap.get(String(r['PRODUCT_SOURCE_ID'] ?? '')) ?? null,
        })))
      : { upserted: 0, failed: 0 };

    logger.info('Ingest inventory/batch', { positions: posResult, lots: lotsResult });
    res.json({
      positions: { received: b.data.positions.length, ...posResult },
      lots:      { received: b.data.lots.length,      ...lotsResult },
    });
  } catch (e) {
    logger.error('POST /api/ingest/inventory/batch', { error: errMsg(e) });
    res.status(500).json({ error: errMsg(e) });
  }
});

// ── Financeiro (Receber + Pagar) ──────────────────────────────────────────────
router.post('/api/ingest/finance/batch', async (req, res) => {
  const b = z.object({
    receivable: z.array(z.record(z.unknown())).max(2000).optional().default([]),
    payable:    z.array(z.record(z.unknown())).max(2000).optional().default([]),
  }).refine(d => d.receivable.length + d.payable.length > 0, {
    message: 'Envie ao menos receivable[] ou payable[]',
  }).safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: 'receivable[] ou payable[] obrigatório' });
    return;
  }

  try {
    const sb = getSupabase();
    const tid = defaultTenantId();
    const arResult = b.data.receivable.length > 0
      ? await upsertBatch(sb, 'accounts_receivable', b.data.receivable.map(r => mapAccountReceivable(r, tid, SOURCE)))
      : { upserted: 0, failed: 0 };
    const apResult = b.data.payable.length > 0
      ? await upsertBatch(sb, 'accounts_payable', b.data.payable.map(r => mapAccountPayable(r, tid, SOURCE)))
      : { upserted: 0, failed: 0 };

    logger.info('Ingest finance/batch', { receivable: arResult, payable: apResult });
    res.json({
      receivable: { received: b.data.receivable.length, ...arResult },
      payable:    { received: b.data.payable.length,    ...apResult },
    });
  } catch (e) {
    logger.error('POST /api/ingest/finance/batch', { error: errMsg(e) });
    res.status(500).json({ error: errMsg(e) });
  }
});

export default router;
