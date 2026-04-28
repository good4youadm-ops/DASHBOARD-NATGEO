import { api } from '../services/api';

export async function fetchFinanceDashboard(options?: {
  arBucket?: string;
  apBucket?: string;
  apCategory?: string;
}) {
  const [summary, receivable, payable] = await Promise.all([
    api.financeSummary(),
    api.accountsReceivable({ bucket: options?.arBucket }),
    api.accountsPayable({ bucket: options?.apBucket, category: options?.apCategory }),
  ]);

  return {
    summary: summary as unknown,
    receivable: receivable as unknown[],
    payable: payable as unknown[],
  };
}
