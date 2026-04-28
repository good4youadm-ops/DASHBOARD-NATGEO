import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

export interface SyncCheckpoint {
  last_synced_at: string | null;
  last_source_updated_at: string | null;
  last_source_id: string | null;
  cursor: Record<string, unknown>;
}

export async function getCheckpoint(
  client: SupabaseClient,
  tenantId: string,
  sourceName: string,
  entityName: string,
): Promise<SyncCheckpoint> {
  const { data, error } = await client
    .from('sync_state')
    .select('last_synced_at, last_source_updated_at, last_source_id, cursor')
    .eq('tenant_id', tenantId)
    .eq('source_name', sourceName)
    .eq('entity_name', entityName)
    .maybeSingle();

  if (error) logger.warn(`Checkpoint não encontrado para ${entityName}`, { error: error.message });

  return {
    last_synced_at: data?.last_synced_at ?? null,
    last_source_updated_at: data?.last_source_updated_at ?? null,
    last_source_id: data?.last_source_id ?? null,
    cursor: (data?.cursor as Record<string, unknown>) ?? {},
  };
}

export async function saveCheckpoint(
  client: SupabaseClient,
  tenantId: string,
  sourceName: string,
  entityName: string,
  checkpoint: Partial<SyncCheckpoint>,
): Promise<void> {
  const { error } = await client.from('sync_state').upsert(
    {
      tenant_id: tenantId,
      source_name: sourceName,
      entity_name: entityName,
      last_synced_at: new Date().toISOString(),
      ...checkpoint,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,source_name,entity_name' },
  );

  if (error) logger.error(`Erro ao salvar checkpoint de ${entityName}`, { error: error.message });
}
