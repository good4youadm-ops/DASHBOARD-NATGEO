import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ── Jobs de Importação ────────────────────────────────────────────────────────
export async function listImportJobs(client: SupabaseClient, tenantId: string, limit = 20) {
  const { data, error } = await client
    .from('import_jobs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getImportJob(client: SupabaseClient, tenantId: string, id: string) {
  const { data, error } = await client
    .from('import_jobs')
    .select('*, import_errors(*)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();
  if (error) throw error;
  return data;
}

export async function createImportJob(
  client: SupabaseClient,
  tenantId: string,
  entity: string,
  source: string,
  createdBy: string,
  options: Record<string, unknown> = {},
) {
  const { data, error } = await client
    .from('import_jobs')
    .insert({
      tenant_id: tenantId,
      entity,
      source,
      status: 'queued',
      created_by: createdBy,
      options,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateImportJob(client: SupabaseClient, tenantId: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await client
    .from('import_jobs')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function appendImportError(
  client: SupabaseClient,
  tenantId: string,
  jobId: string,
  rowNumber: number | null,
  rowData: Record<string, unknown> | null,
  errorCode: string,
  errorMsg: string,
) {
  const { error } = await client.from('import_errors').insert({
    tenant_id: tenantId,
    job_id: jobId,
    row_number: rowNumber,
    row_data: rowData,
    error_code: errorCode,
    error_msg: errorMsg,
  });
  if (error) throw error;
}

// ── Webhooks Log ──────────────────────────────────────────────────────────────
export async function logWebhook(
  client: SupabaseClient,
  tenantId: string | null,
  source: string,
  eventType: string,
  payload: unknown,
  headers: Record<string, string>,
  ipAddress?: string,
) {
  const { data, error } = await client
    .from('webhooks_log')
    .insert({
      tenant_id: tenantId,
      source,
      event_type: eventType,
      payload,
      headers,
      status: 'received',
      ip_address: ipAddress,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

export async function updateWebhookStatus(
  client: SupabaseClient,
  id: string,
  status: 'processed' | 'failed' | 'ignored',
  errorMsg?: string,
) {
  const { error } = await client
    .from('webhooks_log')
    .update({ status, processed_at: new Date().toISOString(), error_msg: errorMsg ?? null })
    .eq('id', id);
  if (error) throw error;
}

export async function listWebhooks(client: SupabaseClient, tenantId: string, source?: string, limit = 50) {
  let q = client
    .from('webhooks_log')
    .select('id,source,event_type,status,created_at,processed_at,ip_address')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (source) q = q.eq('source', source);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ── API Keys ──────────────────────────────────────────────────────────────────
export async function listApiKeys(client: SupabaseClient, tenantId: string) {
  const { data, error } = await client
    .from('api_keys')
    .select('id, name, prefix, scopes, is_active, expires_at, last_used_at, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createApiKey(
  client: SupabaseClient,
  tenantId: string,
  name: string,
  scopes: string[],
  createdBy: string,
  expiresAt?: string,
): Promise<{ id: string; key: string }> {
  const rawKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
  const prefix = rawKey.slice(0, 10);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data, error } = await client
    .from('api_keys')
    .insert({
      tenant_id: tenantId,
      name,
      key_hash: keyHash,
      prefix,
      scopes,
      created_by: createdBy,
      expires_at: expiresAt ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id, key: rawKey };
}

export async function revokeApiKey(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw error;
}

export async function verifyApiKey(client: SupabaseClient, rawKey: string): Promise<{ tenantId: string; scopes: string[] } | null> {
  const prefix = rawKey.slice(0, 10);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data, error } = await client
    .from('api_keys')
    .select('id, tenant_id, scopes, expires_at')
    .eq('prefix', prefix)
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  await client
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return { tenantId: data.tenant_id, scopes: data.scopes };
}
