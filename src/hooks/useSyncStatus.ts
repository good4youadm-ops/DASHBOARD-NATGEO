import { api } from '../services/api';

export interface SyncRun {
  id: string;
  entity_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  rows_read: number;
  rows_inserted: number;
  rows_updated: number;
  rows_failed: number;
  error_message: string | null;
}

export interface SyncState {
  entity_name: string;
  last_synced_at: string | null;
  last_source_updated_at: string | null;
}

export async function fetchSyncStatus(): Promise<{ runs: SyncRun[]; states: SyncState[] }> {
  const data = await api.syncStatus() as { runs: SyncRun[]; states: SyncState[] };
  return data;
}

export async function fetchSyncErrors(limit = 50) {
  return api.syncErrors(limit) as Promise<unknown[]>;
}
