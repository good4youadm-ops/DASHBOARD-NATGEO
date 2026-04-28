import { initOraclePool, closeOraclePool } from './oracle/client';
import { logger } from './utils/logger';
import { syncCustomers } from './entities/customers.sync';
import { syncProducts } from './entities/products.sync';
import { syncSalesOrders } from './entities/sales-orders.sync';
import { syncInventory } from './entities/inventory.sync';
import { syncFinance } from './entities/finance.sync';

type Entity = 'customers' | 'products' | 'sales' | 'inventory' | 'finance' | 'all';

const VALID_ENTITIES: Entity[] = ['customers', 'products', 'sales', 'inventory', 'finance', 'all'];

async function main() {
  const args = process.argv.slice(2);

  // Primeiro arg posicional (não começa com '--') é a entidade
  const entityArg = args.find(a => !a.startsWith('--'));
  const entity: Entity = (VALID_ENTITIES.includes(entityArg as Entity) ? entityArg : 'all') as Entity;

  const fullSync = args.includes('--full');

  // --dry-run pode vir como flag CLI além de DRY_RUN=true no env
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
