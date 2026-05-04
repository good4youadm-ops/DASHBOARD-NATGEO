import { queryOracle } from '../oracle/client';
import { getSupabaseAdmin } from '../supabase/client';
import { batchUpsert } from '../utils/upsert';
import { getCheckpoint, saveCheckpoint } from '../utils/checkpoint';
import { logger } from '../utils/logger';
import { config } from '../config';
import { mapProduct } from '../../../src/mappings/products.mapping';

const ENTITY = 'products';

export async function syncProducts(fullSync = false): Promise<void> {
  const sb = getSupabaseAdmin();
  const { tenantId, sourceName, batchSize } = config.sync;

  const checkpoint = await getCheckpoint(sb, tenantId, sourceName, ENTITY);
  const since = fullSync ? null : checkpoint.last_source_updated_at;

  logger.info(`[${ENTITY}] Iniciando sync`, { fullSync, since });

  const sql = `
    SELECT
      p.PRODUTO_ID          AS SOURCE_ID,
      p.COD_PRODUTO         AS SKU,
      p.DESCRICAO           AS NAME,
      p.DESC_DETALHADA      AS DESCRIPTION,
      p.CATEGORIA           AS CATEGORY,
      p.SUBCATEGORIA        AS SUBCATEGORY,
      p.MARCA               AS BRAND,
      p.FORNECEDOR_ID       AS SUPPLIER_ID,
      p.NOME_FORNECEDOR     AS SUPPLIER_NAME,
      p.UNIDADE             AS UNIT,
      p.PESO_UNIT           AS UNIT_WEIGHT,
      p.UNID_CAIXA          AS UNITS_PER_BOX,
      p.PRECO_CUSTO         AS COST_PRICE,
      p.PRECO_VENDA         AS SALE_PRICE,
      p.PRECO_MINIMO        AS MIN_PRICE,
      p.NCM                 AS NCM,
      p.EAN                 AS EAN,
      p.CURVA_ABC           AS ABC_CURVE,
      p.FRACIONAVEL         AS IS_FRACTIONABLE,
      p.REFRIGERADO         AS REQUIRES_COLD,
      p.VALIDADE_DIAS       AS SHELF_LIFE_DAYS,
      p.ESTOQUE_MINIMO      AS MIN_STOCK,
      p.ESTOQUE_MAXIMO      AS MAX_STOCK,
      p.PONTO_PEDIDO        AS REORDER_POINT,
      p.ATIVO               AS IS_ACTIVE,
      p.DT_ATUALIZACAO      AS UPDATED_AT_SOURCE
    FROM PRODUTOS p
    WHERE 1=1
    ${since ? `AND p.DT_ATUALIZACAO > TO_TIMESTAMP(:since, 'YYYY-MM-DD HH24:MI:SS')` : ''}
    ORDER BY p.DT_ATUALIZACAO ASC
    FETCH FIRST :batchSize ROWS ONLY
  `;

  const rows = await queryOracle(sql, {
    ...(since ? { since: since.replace('T', ' ').replace('Z', '') } : {}),
    batchSize,
  });

  if (rows.length === 0) {
    logger.info(`[${ENTITY}] Nenhum registro novo`);
    await saveCheckpoint(sb, tenantId, sourceName, ENTITY, {});
    return;
  }

  const mapped = rows.map((r) => mapProduct(r, tenantId, sourceName));

  if (config.sync.dryRun) {
    logger.info(`[${ENTITY}] DRY RUN — ${mapped.length} registros não gravados`);
    return;
  }

  const result = await batchUpsert(sb, 'products', mapped);
  logger.info(`[${ENTITY}] Upsert concluído`, result);

  if (result.failed > 0) {
    logger.warn(`[${ENTITY}] ${result.failed} registros falharam — checkpoint NÃO avançado para evitar perda de dados`);
    return;
  }

  const lastRow = rows[rows.length - 1] as Record<string, unknown>;
  await saveCheckpoint(sb, tenantId, sourceName, ENTITY, {
    last_source_updated_at: String(lastRow['UPDATED_AT_SOURCE'] ?? ''),
    last_source_id: String(lastRow['SOURCE_ID'] ?? ''),
  });
}
