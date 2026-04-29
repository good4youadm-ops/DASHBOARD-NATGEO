import { oracleConfigured } from './config';
import { logger } from './utils/logger';

async function main() {
  if (!oracleConfigured) {
    logger.warn('Oracle não configurado (ORACLE_USER/PASSWORD/CONNECT_STRING ausentes). Worker em modo de espera.');
    // Mantém o processo vivo sem crash loop — será ativado quando as vars forem configuradas
    setInterval(() => {
      logger.info('Sync-worker aguardando configuração Oracle...');
    }, 1_800_000);
    return;
  }

  const { initOraclePool, closeOraclePool } = await import('./oracle/client');
  const { syncCustomers }   = await import('./entities/customers.sync');
  const { syncProducts }    = await import('./entities/products.sync');
  const { syncSalesOrders } = await import('./entities/sales-orders.sync');
  const { syncInventory }   = await import('./entities/inventory.sync');
  const { syncFinance }     = await import('./entities/finance.sync');

  type Entity = 'customers' | 'products' | 'sales' | 'inventory' | 'finance' | 'all';
  const VALID_ENTITIES: Entity[] = ['customers', 'products', 'sales', 'inventory', 'finance', 'all'];

  const args = process.argv.slice(2);
  const entityArg = args.find(a => !a.startsWith('--'));
  const entity: Entity = (VALID_ENTITIES.includes(entityArg as Entity) ? entityArg : 'all') as Entity;
  const fullSync = args.includes('--full');
  if (args.includes('--dry-run')) process.env.DRY_RUN = 'true';

  logger.info('Oracle Sync Worker iniciado', { entity, fullSync, dryRun: process.env.DRY_RUN === 'true' });

  await initOraclePool();

  try {
    if (entity === 'all' || entity === 'customers')  await syncCustomers(fullSync);
    if (entity === 'all' || entity === 'products')   await syncProducts(fullSync);
    if (entity === 'all' || entity === 'sales')      await syncSalesOrders(fullSync);
    if (entity === 'all' || entity === 'inventory')  await syncInventory(fullSync);
    if (entity === 'all' || entity === 'finance')    await syncFinance(fullSync);

    logger.info('Sync concluído com sucesso');
  } catch (err) {
    logger.error('Erro fatal no sync', { error: err });
    process.exit(1);
  } finally {
    await closeOraclePool();
  }
}

main();
