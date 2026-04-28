// Mocks de desenvolvimento — NUNCA importar em produção
// Usado apenas quando NODE_ENV=development e API não está disponível

export { mockSalesSummary, mockSalesByDay, mockTopCustomers, mockTopProducts } from './sales.mock';
export { mockInventorySummary, mockStockByProduct, mockExpiringLots } from './inventory.mock';
export { mockFinanceSummary, mockAccountsReceivable, mockAccountsPayable } from './finance.mock';
export { mockSyncStatus } from './sync.mock';
