import { describe, expect, it } from 'vitest';
import {
  pesosToCentavos,
  centavosToPesosNumber,
  formatArs,
  resolveEffectivePriceCentavos,
  calculatePercentageDiscountCentavos,
  calculateOrderTotals,
} from '@/lib/money';

describe('money.ts — Aritmética monetaria en centavos (ARS)', () => {
  it('convierte pesos a centavos enteros sin errores de punto flotante', () => {
    expect(pesosToCentavos(250000)).toBe(25_000_000);
    expect(pesosToCentavos(12000)).toBe(1_200_000);
    expect(pesosToCentavos(19.99)).toBe(1999);
    expect(pesosToCentavos(0)).toBe(0);
  });

  it('rechaza valores negativos o no finitos al convertir a centavos', () => {
    expect(() => pesosToCentavos(-100)).toThrow();
    expect(() => pesosToCentavos(Number.NaN)).toThrow();
    expect(() => pesosToCentavos(Number.POSITIVE_INFINITY)).toThrow();
  });

  it('convierte centavos a número decimal en pesos para pasarelas de pago', () => {
    expect(centavosToPesosNumber(25_000_000)).toBe(250000);
    expect(centavosToPesosNumber(123456)).toBe(1234.56);
  });

  it('formatea importes en español argentino (ARS)', () => {
    const formattedWhole = formatArs(25_000_000);
    expect(formattedWhole).toContain('250.000');

    const formattedWithCents = formatArs(125050);
    expect(formattedWithCents).toContain('1.250,50');
  });

  it('resuelve precios promocionales vigentes y vencidos correctamente', () => {
    const now = new Date('2026-11-15T12:00:00Z');

    // Promo activa (20% off sobre $250.000 -> $200.000)
    const active = resolveEffectivePriceCentavos({
      priceCentavos: 25_000_000,
      promotionalPriceCentavos: 20_000_000,
      promoStartsAt: '2026-11-01T00:00:00Z',
      promoEndsAt: '2026-11-30T23:59:59Z',
      now,
    });
    expect(active.isPromoActive).toBe(true);
    expect(active.effectivePriceCentavos).toBe(20_000_000);
    expect(active.compareAtPriceCentavos).toBe(25_000_000);
    expect(active.discountPercentage).toBe(20);

    // Promo vencida -> usa precio regular
    const expired = resolveEffectivePriceCentavos({
      priceCentavos: 25_000_000,
      promotionalPriceCentavos: 20_000_000,
      promoEndsAt: '2026-10-01T00:00:00Z',
      now,
    });
    expect(expired.isPromoActive).toBe(false);
    expect(expired.effectivePriceCentavos).toBe(25_000_000);
    expect(expired.compareAtPriceCentavos).toBeNull();
  });

  it('calcula descuentos porcentuales respetando topes y subtotales', () => {
    // 15% de $100.000 = $15.000
    expect(calculatePercentageDiscountCentavos(10_000_000, 15)).toBe(1_500_000);
    // Con tope de $10.000
    expect(
      calculatePercentageDiscountCentavos(10_000_000, 15, 1_000_000)
    ).toBe(1_000_000);
  });

  it('calcula totales de orden exactos en servidor (subtotal - descuento + envío)', () => {
    const totals = calculateOrderTotals({
      items: [
        {
          // JPG Le Male Elixir: $250.000 x 1
          unitPriceCentavos: 25_000_000,
          quantity: 1,
        },
        {
          // Cable USB-C: $12.000 con $2.000 desc unitario x 2
          unitPriceCentavos: 1_200_000,
          unitDiscountCentavos: 200_000,
          quantity: 2,
        },
      ],
      orderLevelDiscountCentavos: 1_000_000, // $10.000 cupón adicional
      shippingCentavos: 650_000, // $6.500 envío
    });

    // Subtotal bruto: 250.000 + 24.000 = 274.000 ($27.400.000 centavos)
    expect(totals.subtotalCentavos).toBe(27_400_000);
    // Descuentos: (2.000 * 2) + 10.000 = 14.000 ($1.400.000 centavos)
    expect(totals.discountCentavos).toBe(1_400_000);
    expect(totals.shippingCentavos).toBe(650_000);
    // Total: 274.000 - 14.000 + 6.500 = 266.500 ($26.650.000 centavos)
    expect(totals.totalCentavos).toBe(26_650_000);
  });
});
