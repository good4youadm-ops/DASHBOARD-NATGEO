import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listCustomers, createCustomer, updateCustomer, deleteCustomer } from '../../src/repositories/customers';

const mockSingle  = vi.fn();
const mockSelect  = vi.fn();
const mockInsert  = vi.fn();
const mockUpdate  = vi.fn();
const mockEq      = vi.fn();
const mockOr      = vi.fn();
const mockOrder   = vi.fn();
const mockRange   = vi.fn();

// Supabase client mock
function makeClient(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    or:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    range:  vi.fn().mockReturnThis(),
    single: vi.fn(),
    ...overrides,
  };
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  };
}

describe('customers repository', () => {
  describe('listCustomers', () => {
    it('retorna dados paginados com filtros aplicados', async () => {
      const client = makeClient();
      client._chain.range.mockResolvedValue({ data: [{ id: '1', name: 'Cliente A' }], error: null, count: 1 });

      const result = await listCustomers(client as any, { tenantId: 'tenant-1', search: 'Cliente', page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(client.from).toHaveBeenCalledWith('customers');
    });

    it('lança erro quando Supabase retorna error', async () => {
      const client = makeClient();
      client._chain.range.mockResolvedValue({ data: null, error: new Error('DB error'), count: null });

      await expect(listCustomers(client as any, { tenantId: 'tenant-1' })).rejects.toThrow('DB error');
    });

    it('retorna array vazio quando data é null sem erro', async () => {
      const client = makeClient();
      client._chain.range.mockResolvedValue({ data: null, error: null, count: 0 });

      const result = await listCustomers(client as any, { tenantId: 'tenant-1' });
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('createCustomer', () => {
    it('cria cliente e retorna o registro criado', async () => {
      const created = { id: 'new-id', name: 'Novo Cliente', tenant_id: 'tenant-1' };
      const client = makeClient();
      client._chain.single.mockResolvedValue({ data: created, error: null });

      const result = await createCustomer(client as any, 'tenant-1', { name: 'Novo Cliente' });

      expect(result).toEqual(created);
      expect(client._chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Novo Cliente', tenant_id: 'tenant-1', source_system: 'manual' })
      );
    });

    it('lança erro em caso de falha no insert', async () => {
      const client = makeClient();
      client._chain.single.mockResolvedValue({ data: null, error: new Error('unique constraint') });

      await expect(createCustomer(client as any, 'tenant-1', { name: 'X' })).rejects.toThrow('unique constraint');
    });
  });

  describe('updateCustomer', () => {
    it('atualiza apenas os campos enviados', async () => {
      const updated = { id: 'id-1', name: 'Nome Novo' };
      const client = makeClient();
      client._chain.single.mockResolvedValue({ data: updated, error: null });

      const result = await updateCustomer(client as any, 'tenant-1', 'id-1', { name: 'Nome Novo' });

      expect(result).toEqual(updated);
      expect(client._chain.update).toHaveBeenCalledWith({ name: 'Nome Novo' });
    });
  });

  describe('deleteCustomer (soft delete)', () => {
    it('define is_active=false em vez de excluir', async () => {
      const client = makeClient();

      await deleteCustomer(client as any, 'tenant-1', 'id-1');

      expect(client._chain.update).toHaveBeenCalledWith({ is_active: false });
    });
  });
});
