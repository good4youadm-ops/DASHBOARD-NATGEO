import { describe, it, expect, vi } from 'vitest';
import {
  listAccountsReceivable,
  createAccountReceivable,
  listAccountsPayable,
  createAccountPayable,
  deleteAccountReceivable,
} from '../../src/repositories/finance';

function makeClient(resolvedValue: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    ilike:  vi.fn().mockReturnThis(),
    or:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    range:  vi.fn().mockResolvedValue(resolvedValue),
    single: vi.fn().mockResolvedValue(resolvedValue),
  };
  return { from: vi.fn().mockReturnValue(chain), _chain: chain };
}

describe('finance repository — A Receber', () => {
  it('lista AR com paginação correta', async () => {
    const client = makeClient({ data: [], error: null, count: 0 });
    const result = await listAccountsReceivable(client as any, { tenantId: 'T1', page: 2, limit: 10 });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    // page 2 → from = 10
    expect(client._chain.range).toHaveBeenCalledWith(10, 19);
  });

  it('cria AR com source_system manual', async () => {
    const client = makeClient({ data: { id: 'ar-1' }, error: null });
    await createAccountReceivable(client as any, 'T1', { face_value: 1000, issue_date: '2026-01-01', due_date: '2026-02-01' });
    expect(client._chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ source_system: 'manual', tenant_id: 'T1' })
    );
  });

  it('só exclui lançamentos manuais (filtra source_system=manual)', async () => {
    const client = makeClient({ error: null });
    await deleteAccountReceivable(client as any, 'T1', 'ar-id');
    expect(client._chain.eq).toHaveBeenCalledWith('source_system', 'manual');
  });
});

describe('finance repository — A Pagar', () => {
  it('lista AP e aplica filtro de status', async () => {
    const client = makeClient({ data: [], error: null, count: 0 });
    // Simular retorno com eq para status
    client._chain.range.mockResolvedValue({ data: [], error: null, count: 0 });
    await listAccountsPayable(client as any, { tenantId: 'T1', status: 'open' });
    expect(client._chain.eq).toHaveBeenCalledWith('status', 'open');
  });

  it('cria AP com source_system manual', async () => {
    const client = makeClient({ data: { id: 'ap-1' }, error: null });
    await createAccountPayable(client as any, 'T1', { face_value: 500, issue_date: '2026-01-01', due_date: '2026-02-01' });
    expect(client._chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ source_system: 'manual', tenant_id: 'T1' })
    );
  });
});
