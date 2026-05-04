import { queryOracle } from '../oracle/client';
import { getSupabaseAdmin } from '../supabase/client';
import { batchUpsert } from '../utils/upsert';
import { getCheckpoint, saveCheckpoint } from '../utils/checkpoint';
import { logger } from '../utils/logger';
import { config } from '../config';
import { mapStockPosition, mapStockLot } from '../../../src/mappings/inventory.mapping';

const ENTITY_POS = 'stock_positions';
const ENTITY_LOT = 'stock_lots';

export async function syncInventory(fullSync = false): Promise<void> {
  const sb = getSupabaseAdmin();
  const { tenantId, sourceName, batchSize } = config.sync;

  const checkpoint = await getCheckpoint(sb, tenantId, sourceName, ENTITY_POS);
  const since = fullSync ? null : checkpoint.last_source_updated_at;

  logger.info(`[${ENTITY_POS}] Iniciando sync posições`, { fullSync, since });

  const sqlPositions = `
    SELECT
      e.ESTOQUE_ID          AS SOURCE_ID,
      e.PRODUTO_ID          AS PRODUCT_SOURCE_ID,
      e.DEPOSITO            AS WAREHOUSE,
      e.LOCALIZACAO         AS LOCATION,
      e.QTDE_DISPONIVEL     AS QTY_AVAILABLE,
      e.QTDE_RESERVADA      AS QTY_RESERVED,
      e.QTDE_BLOQUEADA      AS QTY_BLOCKED,
      e.QTDE_TRANSITO       AS QTY_IN_TRANSIT,
      e.CUSTO_MEDIO         AS AVG_COST,
      e.COBERTURA_DIAS      AS COVERAGE_DAYS,
      e.CURVA_ABC           AS ABC_CURVE,
      e.RUPTURA             AS RUPTURA,
      e.DT_POSICAO          AS POSITION_DATE,
      e.DT_ATUALIZACAO      AS UPDATED_AT_SOURCE
    FROM ESTOQUE_POSICAO e
    WHERE 1=1
    ${since ? `AND e.DT_ATUALIZACAO > TO_TIMESTAMP(:since, 'YYYY-MM-DD HH24:MI:SS')` : ''}
    ORDER BY e.DT_ATUALIZACAO ASC
    FETCH FIRST :batchSize ROWS ONLY
  `;

  const posRows = await queryOracle(sqlPositions, {
    ...(since ? { since: since.replace('T', ' ').replace('Z', '') } : {}),
    batchSize,
  });

  if (posRows.length > 0) {
    const mapped = posRows.map((r) => mapStockPosition(r, tenantId, sourceName));
    if (config.sync.dryRun) {
      logger.info(`[${ENTITY_POS}] DRY RUN — ${mapped.length} posições`);
    } else {
      const result = await batchUpsert(sb, 'stock_positions', mapped);
      logger.info(`[${ENTITY_POS}] Upsert concluído`, result);
      if (result.failed > 0) {
        logger.warn(`[${ENTITY_POS}] ${result.failed} posições falharam — checkpoint NÃO avançado`);
      } else {
        const last = posRows[posRows.length - 1] as Record<string, unknown>;
        await saveCheckpoint(sb, tenantId, sourceName, ENTITY_POS, {
          last_source_updated_at: String(last['UPDATED_AT_SOURCE'] ?? ''),
          last_source_id: String(last['SOURCE_ID'] ?? ''),
        });
      }
    }
  } else {
    logger.info(`[${ENTITY_POS}] Nenhuma posição nova`);
  }

  // Lotes
  const checkpointLot = await getCheckpoint(sb, tenantId, sourceName, ENTITY_LOT);
  const sinceLot = fullSync ? null : checkpointLot.last_source_updated_at;

  const sqlLots = `
    SELECT
      l.LOTE_ID             AS SOURCE_ID,
      l.PRODUTO_ID          AS PRODUCT_SOURCE_ID,
      l.NR_LOTE             AS LOT_NUMBER,
      l.DEPOSITO            AS WAREHOUSE,
      l.LOCALIZACAO         AS LOCATION,
      l.DT_FABRICACAO       AS MANUFACTURE_DATE,
      l.DT_VALIDADE         AS EXPIRY_DATE,
      l.STATUS              AS STATUS,
      l.CAIXA_ABERTA        AS IS_OPEN_BOX,
      l.UNID_CAIXA          AS UNITS_PER_BOX,
      l.QTDE_INICIAL        AS QTY_INITIAL,
      l.QTDE_ATUAL          AS QTY_CURRENT,
      l.QTDE_CONSUMIDA      AS QTY_CONSUMED,
      l.CUSTO_UNITARIO      AS UNIT_COST,
      l.FEFO                AS FEFO_COMPLIANT,
      l.DT_ATUALIZACAO      AS UPDATED_AT_SOURCE
    FROM ESTOQUE_LOTES l
    WHERE 1=1
    ${sinceLot ? `AND l.DT_ATUALIZACAO > TO_TIMESTAMP(:since, 'YYYY-MM-DD HH24:MI:SS')` : ''}
    ORDER BY l.DT_ATUALIZACAO ASC
    FETCH FIRST :batchSize ROWS ONLY
  `;

  const lotRows = await queryOracle(sqlLots, {
    ...(sinceLot ? { since: sinceLot.replace('T', ' ').replace('Z', '') } : {}),
    batchSize,
  });

  if (lotRows.length > 0) {
    const mapped = lotRows.map((r) => mapStockLot(r, tenantId, sourceName));
    if (config.sync.dryRun) {
      logger.info(`[${ENTITY_LOT}] DRY RUN — ${mapped.length} lotes`);
    } else {
      const result = await batchUpsert(sb, 'stock_lots', mapped);
      logger.info(`[${ENTITY_LOT}] Upsert concluído`, result);
      if (result.failed > 0) {
        logger.warn(`[${ENTITY_LOT}] ${result.failed} lotes falharam — checkpoint NÃO avançado`);
      } else {
        const last = lotRows[lotRows.length - 1] as Record<string, unknown>;
        await saveCheckpoint(sb, tenantId, sourceName, ENTITY_LOT, {
          last_source_updated_at: String(last['UPDATED_AT_SOURCE'] ?? ''),
          last_source_id: String(last['SOURCE_ID'] ?? ''),
        });
      }
    }
  } else {
    logger.info(`[${ENTITY_LOT}] Nenhum lote novo`);
  }
}
