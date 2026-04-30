import { SupabaseClient } from '@supabase/supabase-js';

// ── Motoristas ────────────────────────────────────────────────────────────────
export async function listDrivers(client: SupabaseClient, tenantId: string, isActive?: boolean) {
  let q = client.from('drivers').select('*', { count: 'exact' }).eq('tenant_id', tenantId).order('name');
  if (isActive != null) q = q.eq('is_active', isActive);
  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}

export async function createDriver(client: SupabaseClient, tenantId: string, body: Record<string, unknown>) {
  const { data, error } = await client.from('drivers').insert({ ...body, tenant_id: tenantId }).select().single();
  if (error) throw error;
  return data;
}

export async function updateDriver(client: SupabaseClient, tenantId: string, id: string, body: Record<string, unknown>) {
  const { data, error } = await client.from('drivers').update(body).eq('tenant_id', tenantId).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteDriver(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client.from('drivers').update({ is_active: false }).eq('tenant_id', tenantId).eq('id', id);
  if (error) throw error;
}

// ── Veículos ──────────────────────────────────────────────────────────────────
export async function listVehicles(client: SupabaseClient, tenantId: string, isActive?: boolean) {
  let q = client.from('vehicles').select('*', { count: 'exact' }).eq('tenant_id', tenantId).order('plate');
  if (isActive != null) q = q.eq('is_active', isActive);
  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}

export async function createVehicle(client: SupabaseClient, tenantId: string, body: Record<string, unknown>) {
  const { data, error } = await client.from('vehicles').insert({ ...body, tenant_id: tenantId }).select().single();
  if (error) throw error;
  return data;
}

export async function updateVehicle(client: SupabaseClient, tenantId: string, id: string, body: Record<string, unknown>) {
  const { data, error } = await client.from('vehicles').update(body).eq('tenant_id', tenantId).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteVehicle(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client.from('vehicles').update({ is_active: false }).eq('tenant_id', tenantId).eq('id', id);
  if (error) throw error;
}

// ── Rotas de Entrega ──────────────────────────────────────────────────────────
export async function listRoutes(client: SupabaseClient, tenantId: string, dateFrom?: string, dateTo?: string) {
  let q = client
    .from('delivery_routes')
    .select('*, drivers(name), vehicles(plate,model)', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('route_date', { ascending: false });
  if (dateFrom) q = q.gte('route_date', dateFrom);
  if (dateTo)   q = q.lte('route_date', dateTo);
  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0 };
}

export async function createRoute(client: SupabaseClient, tenantId: string, body: Record<string, unknown>) {
  const { data, error } = await client.from('delivery_routes').insert({ ...body, tenant_id: tenantId }).select().single();
  if (error) throw error;
  return data;
}

export async function updateRoute(client: SupabaseClient, tenantId: string, id: string, body: Record<string, unknown>) {
  const { data, error } = await client.from('delivery_routes').update(body).eq('tenant_id', tenantId).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRoute(client: SupabaseClient, tenantId: string, id: string) {
  const { error } = await client.from('delivery_routes').update({ status: 'cancelled' }).eq('tenant_id', tenantId).eq('id', id);
  if (error) throw error;
}
