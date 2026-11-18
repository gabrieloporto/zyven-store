import { describe, expect, it } from 'vitest';
import {
  customerAddressSchema,
  updateProfileSchema,
  argentinePostalCodeSchema,
} from '@/modules/customers/schema';
import { hasAdminPrivileges } from '@/lib/security/auth-guards';
import { checkMemoryRateLimit } from '@/lib/security/rate-limit';

describe('customers/schema.ts & security — Validaciones argentinas, roles y rate limit', () => {
  it('valida códigos postales argentinos de 4 dígitos y CPA (ej. 1864 / B1864)', () => {
    expect(argentinePostalCodeSchema.safeParse('1864').success).toBe(true);
    expect(argentinePostalCodeSchema.safeParse('B1864').success).toBe(true);
    expect(argentinePostalCodeSchema.safeParse('C1425ABC').success).toBe(true);
    expect(argentinePostalCodeSchema.safeParse('12').success).toBe(false);
  });

  it('valida direcciones de entrega en Argentina (ej. Alejandro Korn, Buenos Aires)', () => {
    const valid = customerAddressSchema.safeParse({
      label: 'Casa',
      recipientName: 'Gabriel Oporto',
      phone: '1155556666',
      streetName: 'Av. Independencia',
      streetNumber: '450',
      locality: 'Alejandro Korn',
      partyDepartment: 'San Vicente',
      province: 'Buenos Aires',
      postalCode: '1864',
      isDefault: true,
    });
    expect(valid.success).toBe(true);

    const invalidProvince = customerAddressSchema.safeParse({
      recipientName: 'Gabriel Oporto',
      phone: '1155556666',
      streetName: 'Av. Independencia',
      streetNumber: '450',
      locality: 'Madrid',
      province: 'Madrid',
      postalCode: '1864',
    });
    expect(invalidProvince.success).toBe(false);
  });

  it('valida DNI y CUIT en actualización de perfil', () => {
    expect(
      updateProfileSchema.safeParse({
        fullName: 'Juan Pérez',
        phone: '1144445555',
        documentType: 'DNI',
        documentNumber: '38123456',
      }).success
    ).toBe(true);

    expect(
      updateProfileSchema.safeParse({
        fullName: 'Juan Pérez',
        phone: '1144445555',
        documentType: 'DNI',
        documentNumber: 'ABC-123',
      }).success
    ).toBe(false);
  });

  it('verifica privilegios administrativos estrictamente por rol y estado activo', () => {
    expect(hasAdminPrivileges(null)).toBe(false);
    expect(hasAdminPrivileges({ role: 'customer', is_active: true })).toBe(
      false
    );
    expect(hasAdminPrivileges({ role: 'admin', is_active: false })).toBe(false);
    expect(hasAdminPrivileges({ role: 'admin', is_active: true })).toBe(true);
    expect(hasAdminPrivileges({ role: 'operations', is_active: true })).toBe(
      true
    );
  });

  it('aplica límite de peticiones por ventana de tiempo en rate-limit', () => {
    const now = 1_700_000_000_000;
    const key = 'test:rate:1';
    expect(checkMemoryRateLimit(key, 2, 60, now)).toBe(true);
    expect(checkMemoryRateLimit(key, 2, 60, now + 1000)).toBe(true);
    expect(checkMemoryRateLimit(key, 2, 60, now + 2000)).toBe(false);
    // Una vez expirada la ventana (+61s) vuelve a permitir
    expect(checkMemoryRateLimit(key, 2, 60, now + 61_000)).toBe(true);
  });
});
