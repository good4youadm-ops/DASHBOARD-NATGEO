import { fetchJSON, DATA_SOURCES } from '../services/dataService';

/**
 * @file sync-status.json
 * @description Status da última sincronização de dados
 * @fields tenant_id, last_sync_at, status, records_synced, source_system
 * @example { "tenant_id": "t1", "last_sync_at": "2024-05-18T10:00:00Z", "status": "success", "records_synced": 1240, "source_system": "ERP" }
 */
export interface SyncStatusRow {
  tenant_id: string;
  last_sync_at: string;
  status: string;
  records_synced: number;
  source_system: string;
}

/**
 * @file sync-errors.json
 * @description Erros ocorridos na última sincronização
 * @fields id, tenant_id, occurred_at, entity, message, raw_payload
 * @example { "id": "e1", "tenant_id": "t1", "occurred_at": "2024-05-18T10:01:00Z", "entity": "orders", "message": "Valor de campo inválido", "raw_payload": "{}" }
 */
export interface SyncError {
  id: string;
  tenant_id: string;
  occurred_at: string;
  entity: string;
  message: string;
  raw_payload?: string;
}

export async function getSyncStatus(): Promise<SyncStatusRow | null> {
  try {
    const data = await fetchJSON<SyncStatusRow | SyncStatusRow[]>(
      DATA_SOURCES.syncStatus,
      'syncStatus',
    );
    return Array.isArray(data) ? (data[0] ?? null) : data;
  } catch {
    return null;
  }
}

export async function getRecentErrors(limit = 20): Promise<SyncError[]> {
  try {
    const data = await fetchJSON<SyncError[]>(DATA_SOURCES.syncErrors, 'syncErrors');
    return data
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .slice(0, limit);
  } catch {
    return [];
  }
}
