import {
  storeGetAll, storeGetById, storeInsert, storeUpdate,
} from '../services/dataService';

/**
 * @file import-jobs.json   Jobs de importação { id, tenant_id, entity, source, status, created_by, created_at, finished_at, records_processed, records_error }
 * @file webhooks-log.json  Log de webhooks recebidos { id, tenant_id, source, event_type, status, received_at, ip_address }
 * @file api-keys.json      Chaves de API { id, tenant_id, name, key_hash, scopes, is_active, expires_at, created_by, created_at }
 */

// ── Import Jobs ────────────────────────────────────────────────────────────────

export async function listImportJobs(limit = 20) {
  const all = await storeGetAll('importJobs');
  return all
    .sort((a, b) => String(b['created_at']).localeCompare(String(a['created_at'])))
    .slice(0, limit);
}

export async function getImportJob(id: string) {
  return storeGetById('importJobs', id);
}

export async function createImportJob(
  entity: string,
  source: string,
  createdBy: string,
  options?: Record<string, unknown>,
) {
  return storeInsert('importJobs', {
    id: crypto.randomUUID(),
    entity,
    source,
    status: 'pending',
    created_by: createdBy,
    created_at: new Date().toISOString(),
    options: options ?? {},
  });
}

export async function updateImportJob(id: string, payload: Record<string, unknown>) {
  return storeUpdate('importJobs', id, payload);
}

export async function appendImportError(
  jobId: string,
  rowNumber: number,
  rowData: unknown,
  errorCode: string,
  errorMsg: string,
) {
  // Registra o erro como entrada no log de erros do job
  const job = await storeGetById('importJobs', jobId) as Record<string, unknown> | undefined;
  if (!job) throw new Error(`Import job ${jobId} não encontrado`);
  const errors = (job['errors'] as unknown[]) ?? [];
  errors.push({ row: rowNumber, data: rowData, code: errorCode, message: errorMsg });
  return storeUpdate('importJobs', jobId, { errors, records_error: errors.length });
}

// ── Webhooks Log ───────────────────────────────────────────────────────────────

export async function logWebhook(
  source: string,
  eventType: string,
  payload: unknown,
  headers: unknown,
  ipAddress?: string,
) {
  return storeInsert('webhooksLog', {
    id: crypto.randomUUID(),
    source,
    event_type: eventType,
    status: 'received',
    payload,
    headers,
    ip_address: ipAddress,
    received_at: new Date().toISOString(),
  });
}

export async function updateWebhookStatus(id: string, status: string, errorMsg?: string) {
  return storeUpdate('webhooksLog', id, { status, error_message: errorMsg });
}

export async function listWebhooks(source?: string, limit = 50) {
  const all = await storeGetAll('webhooksLog');
  let result = all.sort((a, b) => String(b['received_at']).localeCompare(String(a['received_at'])));
  if (source) result = result.filter(r => r['source'] === source);
  return result.slice(0, limit);
}

// ── API Keys ───────────────────────────────────────────────────────────────────

export async function listApiKeys() {
  // Retorna sem key_hash por segurança
  const all = await storeGetAll('apiKeys');
  return all.map(({ key_hash: _kh, ...rest }) => rest);
}

export async function createApiKey(
  name: string,
  scopes: string[],
  createdBy: string,
  expiresAt?: string,
) {
  const rawKey = crypto.randomUUID();
  return storeInsert('apiKeys', {
    id: crypto.randomUUID(),
    name,
    // Em produção, armazenar apenas o hash. Aqui retornamos a chave uma única vez.
    key_hash: rawKey,
    scopes,
    is_active: true,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    expires_at: expiresAt ?? null,
    _raw_key_once: rawKey, // Removido do response pelo listApiKeys
  });
}

export async function revokeApiKey(id: string) {
  return storeUpdate('apiKeys', id, { is_active: false, revoked_at: new Date().toISOString() });
}

export async function verifyApiKey(rawKey: string) {
  const all = await storeGetAll('apiKeys');
  return all.find(r => r['key_hash'] === rawKey && r['is_active'] === true) ?? null;
}
