import { queryOracle } from '../oracle/client';
import { getSupabaseAdmin } from '../supabase/client';
import { batchUpsert } from '../utils/upsert';
import { getCheckpoint, saveCheckpoint } from '../utils/checkpoint';
import { logger } from '../utils/logger';
import { config } from '../config';
import { mapSalesOrder, mapSalesOrderItem } from '../../../src/mappings/sales-orders.mapping';

const ENTITY = 'sales_orders';
const ENTITY_ITEMS = 'sales_order_items';

export async function syncSalesOrders(fullSync = false): Promise<void> {
  const sb = getSupabaseAdmin();
  const { tenantId, sourceName, batchSize } = config.sync;

  const checkpoint = await getCheckpoint(sb, tenantId, sourceName, ENTITY);
  const since = fullSync ? null : checkpoint.last_source_updated_at;

  logger.info(`[${ENTITY}] Iniciando sync`, { fullSync, since });

  const sqlOrders = `
    SELECT
      p.PEDIDO_ID           AS SOURCE_ID,
      p.CLIENTE_ID          AS CUSTOMER_SOURCE_ID,
      p.NR_PEDIDO           AS ORDER_NUMBER,
      p.DT_PEDIDO           AS ORDER_DATE,
      p.DT_ENTREGA          AS DELIVERY_DATE,
      p.STATUS              AS STATUS,
      p.PRAZO_PAGTO         AS PAYMENT_TERMS,
      p.FORMA_PAGTO         AS PAYMENT_METHOD,
      p.VENDEDOR            AS SALESPERSON,
      p.FILIAL              AS BRANCH,
      p.CANAL               AS CHANNEL,
      p.VL_SUBTOTAL         AS SUBTOTAL,
      p.VL_DESCONTO         AS DISCOUNT_AMOUNT,
      p.VL_IMPOSTO          AS TAX_AMOUNT,
      p.VL_FRETE            AS FREIGHT_AMOUNT,
      p.VL_TOTAL            AS TOTAL_AMOUNT,
      p.OBS                 AS NOTES,
      p.DT_ATUALIZACAO      AS UPDATED_AT_SOURCE
    FROM PEDIDOS_VENDA p
    WHERE 1=1
    ${since ? `AND p.DT_ATUALIZACAO > TO_TIMESTAMP(:since, 'YYYY-MM-DD HH24:MI:SS')` : ''}
    ORDER BY p.DT_ATUALIZACAO ASC
    FETCH FIRST :batchSize ROWS ONLY
  `;

  const orderRows = await queryOracle(sqlOrders, {
    ...(since ? { since: since.replace('T', ' ').replace('Z', '') } : {}),
    batchSize,
  });

  if (orderRows.length === 0) {
    logger.info(`[${ENTITY}] Nenhum pedido novo`);
    await saveCheckpoint(sb, tenantId, sourceName, ENTITY, {});
    return;
  }

  const mappedOrders = orderRows.map((r) => mapSalesOrder(r, tenantId, sourceName));
  if (!config.sync.dryRun) {
    const result = await batchUpsert(sb, 'sales_orders', mappedOrders);
    logger.info(`[${ENTITY}] Pedidos upsert concluído`, result);
  }

  // Sync itens dos pedidos encontrados
  const sourceIds = orderRows.map((r) => `'${(r as Record<string, unknown>)['SOURCE_ID']}'`).join(',');
  const sqlItems = `
    SELECT
      i.ITEM_ID             AS SOURCE_ID,
      i.PEDIDO_ID           AS ORDER_SOURCE_ID,
      i.PRODUTO_ID          AS PRODUCT_SOURCE_ID,
      i.NR_LINHA            AS LINE_NUMBER,
      i.COD_PRODUTO         AS PRODUCT_CODE,
      i.DESC_PRODUTO        AS PRODUCT_NAME,
      i.UNIDADE             AS UNIT,
      i.QTDE                AS QUANTITY,
      i.QTDE_ENTREGUE       AS QUANTITY_SHIPPED,
      i.VL_UNITARIO         AS UNIT_PRICE,
      i.PERC_DESCONTO       AS DISCOUNT_PCT,
      i.VL_DESCONTO         AS DISCOUNT_AMOUNT,
      i.VL_TOTAL            AS TOTAL_AMOUNT,
      i.STATUS              AS STATUS
    FROM PEDIDOS_VENDA_ITENS i
    WHERE i.PEDIDO_ID IN (${sourceIds})
  `;

  const itemRows = await queryOracle(sqlItems);
  if (itemRows.length > 0) {
    const mappedItems = itemRows.map((r) => mapSalesOrderItem(r, tenantId, sourceName));
    if (!config.sync.dryRun) {
      const result = await batchUpsert(sb, 'sales_order_items', mappedItems);
      logger.info(`[${ENTITY_ITEMS}] Itens upsert concluído`, result);
    }
  }

  const lastRow = orderRows[orderRows.length - 1] as Record<string, unknown>;
  await saveCheckpoint(sb, tenantId, sourceName, ENTITY, {
    last_source_updated_at: String(lastRow['UPDATED_AT_SOURCE'] ?? ''),
    last_source_id: String(lastRow['SOURCE_ID'] ?? ''),
  });
}
