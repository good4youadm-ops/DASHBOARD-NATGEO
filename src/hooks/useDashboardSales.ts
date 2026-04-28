// Hook para buscar dados de vendas da API
// Compatível com uso em vanilla JS via chamada direta das funções

import { api } from '../services/api';

export interface SalesDashboardData {
  summary: unknown[];
  byDay: unknown[];
  topCustomers: unknown[];
  topProducts: unknown[];
  loading: boolean;
  error: string | null;
}

// Vanilla JS version — retorna Promise com todos os dados de vendas
export async function fetchSalesDashboard(months = 12): Promise<Omit<SalesDashboardData, 'loading' | 'error'>> {
  const [summary, byDay, topCustomers, topProducts] = await Promise.all([
    api.salesSummary(months),
    api.salesByDay(),
    api.topCustomers(20),
    api.topProducts(20),
  ]);

  return {
    summary: summary as unknown[],
    byDay: byDay as unknown[],
    topCustomers: topCustomers as unknown[],
    topProducts: topProducts as unknown[],
  };
}
