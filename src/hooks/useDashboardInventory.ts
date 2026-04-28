import { api } from '../services/api';

export async function fetchInventoryDashboard(options?: {
  warehouse?: string;
  abcCurve?: string;
  alertOnly?: boolean;
  daysAheadExpiry?: number;
}) {
  const [summary, stockByProduct, expiringLots] = await Promise.all([
    api.inventorySummary(),
    api.stockByProduct({
      warehouse: options?.warehouse,
      abcCurve: options?.abcCurve,
      alertOnly: options?.alertOnly ? 'true' : undefined,
    }),
    api.expiringLots(options?.daysAheadExpiry ?? 90),
  ]);

  return {
    summary: summary as unknown,
    stockByProduct: stockByProduct as unknown[],
    expiringLots: expiringLots as unknown[],
  };
}
