import { queryOracle } from '../oracle/client';
import { getSupabaseAdmin } from '../supabase/client';
import { batchUpsert } from '../utils/upsert';
import { getCheckpoint, saveCheckpoint } from '../utils/checkpoint';
import { logger } from '../utils/logger';
import { config } from '../config';
import { mapCustomer } from '../../../src/mappings/customers.mapping';

const ENTITY = 'customers';

export async function syncCustomers(fullSync = false): Promise<void> {
  const sb = getSupabaseAdmin();
  const { tenantId, sourceName, batchSize } = config.sync;

  const checkpoint = await getCheckpoint(sb, tenantId, sourceName, ENTITY);
  const since = fullSync ? null : checkpoint.last_source_updated_at;

  logger.info(`[${ENTITY}] Iniciando sync`, { fullSync, since });

  const sql = `
    SELECT
      c.CLIENTE_ID          AS SOURCE_ID,
      c.COD_CLIENTE         AS CODE,
      c.NOME_CLIENTE        AS NAME,
      c.NOME_FANTASIA       AS TRADE_NAME,
      c.CNPJ_CPF            AS DOCUMENT,
      c.TIPO_PESSOA         AS DOCUMENT_TYPE,
      c.EMAIL               AS EMAIL,
      c.TELEFONE            AS PHONE,
      c.LOGRADOURO          AS ADDRESS_STREET,
      c.NUMERO              AS ADDRESS_NUMBER,
      c.BAIRRO              AS ADDRESS_NEIGHBORHOOD,
      c.CIDADE              AS ADDRESS_CITY,
      c.UF                  AS ADDRESS_STATE,
      c.CEP                 AS ADDRESS_ZIP,
      c.SEGMENTO            AS SEGMENT,
      c.CLASSIFICACAO       AS CLASSIFICATION,
      c.LIMITE_CREDITO      AS CREDIT_LIMIT,
      c.PRAZO_PAGTO         AS PAYMENT_TERMS,
      c.ATIVO               AS IS_ACTIVE,
      c.DT_ATUALIZACAO      AS UPDATED_AT_SOURCE
    FROM CLIENTES c
    WHERE 1=1
    ${since ? `AND c.DT_ATUALIZACAO > TO_TIMESTAMP(:since, 'YYYY-MM-DD HH24:MI:SS')` : ''}
    ORDER BY c.DT_ATUALIZACAO ASC
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

  const mapped = rows.map((r) => mapCustomer(r, tenantId, sourceName));

  if (!config.sync.dryRun) {
    const result = await batchUpsert(sb, 'customers', mapped);
    logger.info(`[${ENTITY}] Upsert concluído`, result);
  } else {
    logger.info(`[${ENTITY}] DRY RUN — ${mapped.length} registros não gravados`);
  }

  const lastRow = rows[rows.length - 1] as Record<string, unknown>;
  await saveCheckpoint(sb, tenantId, sourceName, ENTITY, {
    last_source_updated_at: String(lastRow['UPDATED_AT_SOURCE'] ?? ''),
    last_source_id: String(lastRow['SOURCE_ID'] ?? ''),
  });
}
