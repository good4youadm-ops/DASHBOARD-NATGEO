export const mockSyncStatus = {
  runs: [
    { id: '1', entity_name: 'customers', status: 'success', started_at: new Date(Date.now() - 3600000).toISOString(), finished_at: new Date(Date.now() - 3540000).toISOString(), rows_read: 1240, rows_inserted: 12, rows_updated: 45, rows_failed: 0, error_message: null },
    { id: '2', entity_name: 'products', status: 'success', started_at: new Date(Date.now() - 3600000).toISOString(), finished_at: new Date(Date.now() - 3535000).toISOString(), rows_read: 842, rows_inserted: 3, rows_updated: 21, rows_failed: 0, error_message: null },
    { id: '3', entity_name: 'sales_orders', status: 'success', started_at: new Date(Date.now() - 3600000).toISOString(), finished_at: new Date(Date.now() - 3500000).toISOString(), rows_read: 500, rows_inserted: 87, rows_updated: 134, rows_failed: 0, error_message: null },
    { id: '4', entity_name: 'stock_positions', status: 'partial', started_at: new Date(Date.now() - 1800000).toISOString(), finished_at: new Date(Date.now() - 1760000).toISOString(), rows_read: 842, rows_inserted: 0, rows_updated: 839, rows_failed: 3, error_message: 'Timeout em 3 registros' },
    { id: '5', entity_name: 'accounts_receivable', status: 'running', started_at: new Date(Date.now() - 120000).toISOString(), finished_at: null, rows_read: 320, rows_inserted: 45, rows_updated: 275, rows_failed: 0, error_message: null },
  ],
  states: [
    { entity_name: 'customers', last_synced_at: new Date(Date.now() - 3540000).toISOString(), last_source_updated_at: new Date(Date.now() - 7200000).toISOString() },
    { entity_name: 'products', last_synced_at: new Date(Date.now() - 3535000).toISOString(), last_source_updated_at: new Date(Date.now() - 7200000).toISOString() },
    { entity_name: 'sales_orders', last_synced_at: new Date(Date.now() - 3500000).toISOString(), last_source_updated_at: new Date(Date.now() - 3600000).toISOString() },
    { entity_name: 'stock_positions', last_synced_at: new Date(Date.now() - 1760000).toISOString(), last_source_updated_at: new Date(Date.now() - 1800000).toISOString() },
    { entity_name: 'accounts_receivable', last_synced_at: null, last_source_updated_at: null },
  ],
};
