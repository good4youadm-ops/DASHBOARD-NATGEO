import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

const CHUNK_SIZE = 500;

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

  // Divide em chunks para evitar timeout e limite de payload do Supabase
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await client
      .from(table)
      .upsert(chunk, { onConflict: conflictColumns, ignoreDuplicates: false });

    if (error) {
      logger.error(`Erro no upsert em ${table} (chunk ${i / CHUNK_SIZE + 1})`, { error: error.message });
      result.failed += chunk.length;
      result.errors.push(...chunk.map((r) => ({
        source_id: String(r.source_id ?? ''),
        error: error.message,
      })));
    } else {
      result.updated += chunk.length;
    }
  }

  return result;
}
