import { Response } from 'express';
import { z, ZodError } from 'zod';

const NODE_ENV = process.env.NODE_ENV ?? 'development';

export const qMonths    = z.object({ months:    z.coerce.number().int().min(1).max(36).default(12) });
export const qLimit20   = z.object({ limit:     z.coerce.number().int().min(1).max(100).default(20) });
export const qLimit50   = z.object({ limit:     z.coerce.number().int().min(1).max(200).default(50) });
export const qDaysAhead = z.object({ daysAhead: z.coerce.number().int().min(1).max(365).default(90) });
export const qInventory = z.object({
  warehouse: z.string().max(100).optional(),
  abcCurve:  z.enum(['A','B','C','D']).optional(),
  alertOnly: z.enum(['true','false']).optional(),
});
export const qAR = z.object({
  bucket:     z.string().max(50).optional(),
  customerId: z.string().uuid().optional(),
});
export const qAP = z.object({
  bucket:   z.string().max(50).optional(),
  category: z.string().max(100).optional(),
});
export const qCrudList = z.object({
  search:   z.string().max(200).optional(),
  isActive: z.enum(['true','false']).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(200).default(50),
});
export const qYear = z.object({
  year:  z.coerce.number().int().min(2020).max(2099).default(new Date().getFullYear()),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseQuery<T>(schema: z.ZodType<T, any, any>, query: unknown, res: Response): T | null {
  const result = schema.safeParse(query);
  if (!result.success) {
    res.status(400).json({ error: 'Parâmetros inválidos', details: result.error.flatten() });
    return null;
  }
  return result.data;
}

export function errMsg(e: unknown): string {
  if (e instanceof ZodError) return 'Parâmetros inválidos';
  if (NODE_ENV === 'production') return 'Erro interno do servidor';
  return e instanceof Error ? e.message : String(e);
}
