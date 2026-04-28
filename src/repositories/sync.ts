import { SupabaseClient } from '@supabase/supabase-js';

export async function getSyncStatus(client: SupabaseClient, tenantId: string) {
  const { data: runs, error: runsError } = await client
    .from('sync_runs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('started_at', { ascending: false })
    .limit(20);

  if (runsError) throw runsError;

  const { data: states, error: statesError } = await client
    .from('sync_state')
    .select('*')
    .eq('tenant_id', tenantId);

  if (statesError) throw statesError;

  return { runs: runs ?? [], states: states ?? [] };
}

export async function getRecentErrors(
  client: SupabaseClient,
  tenantId: string,
  limit = 50,
) {
  const { data, error } = await client
    .from('sync_errors')
    .select('*, sync_runs(entity_name, started_at)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
