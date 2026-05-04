import { queryOracle } from '../oracle/client';
import { getSupabaseAdmin } from '../supabase/client';
import { batchUpsert } from '../utils/upsert';
import { getCheckpoint, saveCheckpoint } from '../utils/checkpoint';
import { logger } from '../utils/logger';
import { config } from '../config';
import { mapAccountReceivable, mapAccountPayable } from '../../../src/mappings/finance.mapping';

const ENTITY_AR = 'accounts_receivable';
const ENTITY_AP = 'accounts_payable';

export async function syncFinance(fullSync = false): Promise<void> {
  const sb = getSupabaseAdmin();
  const { tenantId, sourceName, batchSize } = config.sync;

  // === Contas a Receber ===
  const checkpointAR = await getCheckpoint(sb, tenantId, sourceName, ENTITY_AR);
  const sinceAR = fullSync ? null : checkpointAR.last_source_updated_at;
  logger.info(`[${ENTITY_AR}] Iniciando sync`, { fullSync, since: sinceAR });

  const sqlAR = `
    SELECT
      r.TITULO_ID           AS SOURCE_ID,
      r.CLIENTE_ID          AS CUSTOMER_SOURCE_ID,
      r.NF_ID               AS INVOICE_SOURCE_ID,
      r.NR_DOCUMENTO        AS DOCUMENT_NUMBER,
      r.PARCELA             AS PARCEL,
      r.DT_EMISSAO          AS ISSUE_DATE,
      r.DT_VENCIMENTO       AS DUE_DATE,
      r.DT_PAGAMENTO        AS PAYMENT_DATE,
      r.STATUS              AS STATUS,
      r.VL_ORIGINAL         AS FACE_VALUE,
      r.VL_PAGO             AS PAID_AMOUNT,
      r.VL_JUROS            AS INTEREST_AMOUNT,
      r.VL_DESCONTO         AS DISCOUNT_AMOUNT,
      r.FORMA_PAGTO         AS PAYMENT_METHOD,
      r.CONTA_BANCARIA      AS BANK_ACCOUNT,
      r.OBS                 AS NOTES,
      r.DT_ATUALIZACAO      AS UPDATED_AT_SOURCE
    FROM TITULOS_RECEBER r
    WHERE 1=1
    ${sinceAR ? `AND r.DT_ATUALIZACAO > TO_TIMESTAMP(:since, 'YYYY-MM-DD HH24:MI:SS')` : ''}
    ORDER BY r.DT_ATUALIZACAO ASC
    FETCH FIRST :batchSize ROWS ONLY
  `;

  const arRows = await queryOracle(sqlAR, {
    ...(sinceAR ? { since: sinceAR.replace('T', ' ').replace('Z', '') } : {}),
    batchSize,
  });

  if (arRows.length > 0) {
    const mapped = arRows.map((r) => mapAccountReceivable(r, tenantId, sourceName));
    if (config.sync.dryRun) {
      logger.info(`[${ENTITY_AR}] DRY RUN — ${mapped.length} registros não gravados`);
    } else {
      const result = await batchUpsert(sb, 'accounts_receivable', mapped);
      logger.info(`[${ENTITY_AR}] Upsert concluído`, result);
      if (result.failed > 0) {
        logger.warn(`[${ENTITY_AR}] ${result.failed} registros falharam — checkpoint NÃO avançado`);
      } else {
        const last = arRows[arRows.length - 1] as Record<string, unknown>;
        await saveCheckpoint(sb, tenantId, sourceName, ENTITY_AR, {
          last_source_updated_at: String(last['UPDATED_AT_SOURCE'] ?? ''),
          last_source_id: String(last['SOURCE_ID'] ?? ''),
        });
      }
    }
  } else {
    logger.info(`[${ENTITY_AR}] Nenhum título novo`);
  }

  // === Contas a Pagar ===
  const checkpointAP = await getCheckpoint(sb, tenantId, sourceName, ENTITY_AP);
  const sinceAP = fullSync ? null : checkpointAP.last_source_updated_at;
  logger.info(`[${ENTITY_AP}] Iniciando sync`, { fullSync, since: sinceAP });

  const sqlAP = `
    SELECT
      p.TITULO_ID           AS SOURCE_ID,
      p.FORNECEDOR_ID       AS SUPPLIER_SOURCE_ID,
      p.NOME_FORNECEDOR     AS SUPPLIER_NAME,
      p.CNPJ_FORNECEDOR     AS SUPPLIER_DOCUMENT,
      p.NR_DOCUMENTO        AS DOCUMENT_NUMBER,
      p.PARCELA             AS PARCEL,
      p.CATEGORIA           AS CATEGORY,
      p.CENTRO_CUSTO        AS COST_CENTER,
      p.DT_EMISSAO          AS ISSUE_DATE,
      p.DT_VENCIMENTO       AS DUE_DATE,
      p.DT_PAGAMENTO        AS PAYMENT_DATE,
      p.STATUS              AS STATUS,
      p.VL_ORIGINAL         AS FACE_VALUE,
      p.VL_PAGO             AS PAID_AMOUNT,
      p.VL_JUROS            AS INTEREST_AMOUNT,
      p.VL_DESCONTO         AS DISCOUNT_AMOUNT,
      p.FORMA_PAGTO         AS PAYMENT_METHOD,
      p.CONTA_BANCARIA      AS BANK_ACCOUNT,
      p.OBS                 AS NOTES,
      p.DT_ATUALIZACAO      AS UPDATED_AT_SOURCE
    FROM TITULOS_PAGAR p
    WHERE 1=1
    ${sinceAP ? `AND p.DT_ATUALIZACAO > TO_TIMESTAMP(:since, 'YYYY-MM-DD HH24:MI:SS')` : ''}
    ORDER BY p.DT_ATUALIZACAO ASC
    FETCH FIRST :batchSize ROWS ONLY
  `;

  const apRows = await queryOracle(sqlAP, {
    ...(sinceAP ? { since: sinceAP.replace('T', ' ').replace('Z', '') } : {}),
    batchSize,
  });

  if (apRows.length > 0) {
    const mapped = apRows.map((r) => mapAccountPayable(r, tenantId, sourceName));
    if (config.sync.dryRun) {
      logger.info(`[${ENTITY_AP}] DRY RUN — ${mapped.length} registros não gravados`);
    } else {
      const result = await batchUpsert(sb, 'accounts_payable', mapped);
      logger.info(`[${ENTITY_AP}] Upsert concluído`, result);
      if (result.failed > 0) {
        logger.warn(`[${ENTITY_AP}] ${result.failed} registros falharam — checkpoint NÃO avançado`);
      } else {
        const last = apRows[apRows.length - 1] as Record<string, unknown>;
        await saveCheckpoint(sb, tenantId, sourceName, ENTITY_AP, {
          last_source_updated_at: String(last['UPDATED_AT_SOURCE'] ?? ''),
          last_source_id: String(last['SOURCE_ID'] ?? ''),
        });
      }
    }
  } else {
    logger.info(`[${ENTITY_AP}] Nenhum título a pagar novo`);
  }
}
