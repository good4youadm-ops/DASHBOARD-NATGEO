import {
  storeGetAll, storeGetById, storeInsert, storeUpdate, storeDelete,
} from '../services/dataService';

/**
 * @file drivers.json
 * @description Motoristas
 * @fields id, tenant_id, name, document, license_number, phone, is_active
 * @example { "id": "d1", "tenant_id": "t1", "name": "João Silva", "document": "123.456.789-00", "license_number": "ABC1234", "phone": "(11) 9999-0000", "is_active": true }
 */

/**
 * @file vehicles.json
 * @description Veículos
 * @fields id, tenant_id, plate, model, brand, year, capacity_kg, is_active
 * @example { "id": "v1", "tenant_id": "t1", "plate": "ABC-1234", "model": "Sprinter", "brand": "Mercedes", "year": 2022, "capacity_kg": 1500, "is_active": true }
 */

/**
 * @file delivery-routes.json
 * @description Rotas de entrega
 * @fields id, tenant_id, route_date, driver_id, vehicle_id, status, total_stops, total_km, notes
 * @example { "id": "r1", "tenant_id": "t1", "route_date": "2024-05-20", "driver_id": "d1", "vehicle_id": "v1", "status": "planned", "total_stops": 8, "total_km": 120 }
 */

export async function listDrivers(isActive?: boolean) {
  const all = await storeGetAll('drivers');
  if (isActive !== undefined) return all.filter(r => r['is_active'] === isActive);
  return all;
}

export async function createDriver(body: Record<string, unknown>) {
  return storeInsert('drivers', { ...body, id: crypto.randomUUID() });
}

export async function updateDriver(id: string, body: Record<string, unknown>) {
  return storeUpdate('drivers', id, body);
}

export async function deleteDriver(id: string) {
  return storeDelete('drivers', id);
}

export async function listVehicles(isActive?: boolean) {
  const all = await storeGetAll('vehicles');
  if (isActive !== undefined) return all.filter(r => r['is_active'] === isActive);
  return all;
}

export async function createVehicle(body: Record<string, unknown>) {
  return storeInsert('vehicles', { ...body, id: crypto.randomUUID() });
}

export async function updateVehicle(id: string, body: Record<string, unknown>) {
  return storeUpdate('vehicles', id, body);
}

export async function deleteVehicle(id: string) {
  return storeDelete('vehicles', id);
}

export async function listRoutes(dateFrom?: string, dateTo?: string) {
  const all = await storeGetAll('deliveryRoutes');
  let result = all;
  if (dateFrom) result = result.filter(r => String(r['route_date']) >= dateFrom);
  if (dateTo)   result = result.filter(r => String(r['route_date']) <= dateTo);
  return result;
}

export async function createRoute(body: Record<string, unknown>) {
  return storeInsert('deliveryRoutes', { ...body, id: crypto.randomUUID() });
}

export async function updateRoute(id: string, body: Record<string, unknown>) {
  return storeUpdate('deliveryRoutes', id, body);
}

export async function deleteRoute(id: string) {
  return storeDelete('deliveryRoutes', id);
}
