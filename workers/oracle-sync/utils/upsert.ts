import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

interface UpsertResult {
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ source_id: string; error: string }>;
}

export async function batchUpsert<T extends Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  rows: T[],
  conflictColumns: string = 'tenant_id,source_system,source_id',
): Promise<UpsertResult> {
  const result: UpsertResult = { inserted: 0, updated: 0, failed: 0, errors: [] };
  if (rows.length === 0) return result;

  const { error } = await client
    .from(table)
    .upsert(rows, { onConflict: conflictColumns, ignoreDuplicates: false });

  if (error) {
    logger.error(`Erro no upsert em ${table}`, { error: error.message });
    result.failed = rows.length;
    result.errors = rows.map((r) => ({
      source_id: String(r.source_id ?? ''),
      error: error.message,
    }));
  } else {
    // Supabase não distingue insert vs update no upsert — contamos tudo como updated
    result.updated = rows.length;
  }

  return result;
}
