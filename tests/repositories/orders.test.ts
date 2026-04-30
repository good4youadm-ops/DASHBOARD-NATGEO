import { describe, it, expect, vi } from 'vitest';
import { listOrders, createOrder, updateOrder, deleteOrder, addOrderItem } from '../../src/repositories/orders';

function makeClient(resolvedValue: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    gte:    vi.fn().mockReturnThis(),
    lte:    vi.fn().mockReturnThis(),
    or:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    range:  vi.fn().mockResolvedValue(resolvedValue),
    single: vi.fn().mockResolvedValue(resolvedValue),
  };
  return { from: vi.fn().mockReturnValue(chain), _chain: chain };
}

describe('orders repository', () => {
  it('lista pedidos e aplica filtro de status', async () => {
    const client = makeClient({ data: [], error: null, count: 0 });
    await listOrders(client as any, { tenantId: 'T1', status: 'pending' });
    expect(client._chain.eq).toHaveBeenCalledWith('status', 'pending');
  });

  it('aplica filtros de data quando fornecidos', async () => {
    const client = makeClient({ data: [], error: null, count: 0 });
    await listOrders(client as any, { tenantId: 'T1', dateFrom: '2026-01-01', dateTo: '2026-12-31' });
    expect(client._chain.gte).toHaveBeenCalledWith('order_date', '2026-01-01');
    expect(client._chain.lte).toHaveBeenCalledWith('order_date', '2026-12-31');
  });

  it('cria pedido com source_system=manual e gera source_id único', async () => {
    const client = makeClient({ data: { id: 'ord-1' }, error: null });
    await createOrder(client as any, 'T1', { order_date: '2026-04-30', total_amount: 1500 });
    const insertCall = client._chain.insert.mock.calls[0][0];
    expect(insertCall.source_system).toBe('manual');
    expect(insertCall.tenant_id).toBe('T1');
    expect(typeof insertCall.source_id).toBe('string');
    expect(insertCall.source_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('deleteOrder define status=cancelled em vez de excluir', async () => {
    const client = makeClient({ error: null });
    await deleteOrder(client as any, 'T1', 'ord-1');
    expect(client._chain.update).toHaveBeenCalledWith({ status: 'cancelled' });
  });

  it('atualiza apenas campos do pedido fornecidos', async () => {
    const client = makeClient({ data: { id: 'ord-1', status: 'approved' }, error: null });
    const result = await updateOrder(client as any, 'T1', 'ord-1', { status: 'approved' });
    expect(result).toEqual({ id: 'ord-1', status: 'approved' });
    expect(client._chain.update).toHaveBeenCalledWith({ status: 'approved' });
  });

  it('addOrderItem inclui sales_order_id e source_system=manual', async () => {
    const client = makeClient({ data: { id: 'item-1' }, error: null });
    await addOrderItem(client as any, 'T1', 'ord-1', { product_name: 'Tofu', quantity: 10, unit_price: 15, total_amount: 150 });
    expect(client._chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ sales_order_id: 'ord-1', source_system: 'manual' })
    );
  });
});
