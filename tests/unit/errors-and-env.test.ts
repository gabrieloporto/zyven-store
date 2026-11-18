import { describe, expect, it, afterEach } from 'vitest';
import { getServerEnv } from '@/lib/env';
import { AppError, ok, fail, toActionError } from '@/lib/errors';

describe('env.ts & errors.ts — Seguridad de entorno y manejo de errores', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalSim = process.env.ENABLE_SHIPPING_SIMULATOR;

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV =
      originalNodeEnv;
    process.env.VERCEL_ENV = originalVercelEnv;
    process.env.ENABLE_SHIPPING_SIMULATOR = originalSim;
  });

  it('impide habilitar ENABLE_SHIPPING_SIMULATOR en producción (Sección 10)', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.VERCEL_ENV = 'production';
    process.env.ENABLE_SHIPPING_SIMULATOR = 'true';

    expect(() => getServerEnv()).toThrow(/ENABLE_SHIPPING_SIMULATOR/);
  });

  it('permite ENABLE_SHIPPING_SIMULATOR en desarrollo y test', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    process.env.ENABLE_SHIPPING_SIMULATOR = 'true';

    const env = getServerEnv();
    expect(env.ENABLE_SHIPPING_SIMULATOR).toBe(true);
  });

  it('mapea AppError a códigos HTTP y ActionResult consistentes', () => {
    const stockErr = new AppError({
      code: 'INSUFFICIENT_STOCK',
      message: 'No hay stock disponible para la variante seleccionada.',
      details: { variantSku: 'PERF-XER-ACC-100' },
    });

    expect(stockErr.statusCode).toBe(409);

    const actionRes = toActionError(stockErr);
    expect(actionRes.ok).toBe(false);
    if (!actionRes.ok) {
      expect(actionRes.error.code).toBe('INSUFFICIENT_STOCK');
      expect(actionRes.error.details).toEqual({
        variantSku: 'PERF-XER-ACC-100',
      });
    }

    const successRes = ok({ orderId: '123' });
    expect(successRes).toEqual({ ok: true, data: { orderId: '123' } });

    const explicitFail = fail('FORBIDDEN', 'Permisos insuficientes');
    expect(explicitFail.ok).toBe(false);
  });
});
