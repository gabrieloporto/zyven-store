import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { upsertProductSchema, upsertVariantSchema } from '@/modules/products/schema';
import { optimizeProductImageToWebp } from '@/modules/products/image-optimizer';
import { computeNewOnHandAfterAdjustment } from '@/modules/inventory/schema';
import {
  resolveImageIndexForVariant,
  type CarouselImageItem,
} from '@/components/storefront/ProductImageCarousel';

describe('products & inventory — Catálogo, variantes, imágenes WebP y control de stock', () => {
  it('impide publicar un producto si commercialNameConfirmed es false (Sección 26.D)', () => {
    const unconfirmedActive = upsertProductSchema.safeParse({
      categoryId: '11111111-1111-4111-8111-111111111111',
      name: 'Invictus Pogo Rebanne 100 ml',
      slug: 'invictus-pogo-rebanne-100ml',
      status: 'active',
      commercialNameConfirmed: false,
    });
    expect(unconfirmedActive.success).toBe(false);

    const unconfirmedDraft = upsertProductSchema.safeParse({
      categoryId: '11111111-1111-4111-8111-111111111111',
      name: 'Invictus Pogo Rebanne 100 ml',
      slug: 'invictus-pogo-rebanne-100ml',
      status: 'draft',
      commercialNameConfirmed: false,
    });
    expect(unconfirmedDraft.success).toBe(true);
  });

  it('exige especificar el tipo de batería de litio cuando containsLithiumBattery es true', () => {
    const missingBatteryType = upsertProductSchema.safeParse({
      categoryId: '11111111-1111-4111-8111-111111111111',
      name: 'Cargador MagSafe',
      slug: 'cargador-magsafe',
      containsLithiumBattery: true,
      lithiumBatteryType: 'none',
    });
    expect(missingBatteryType.success).toBe(false);
  });

  it('valida variantes y convierte precios en pesos a centavos enteros', () => {
    const valid = upsertVariantSchema.safeParse({
      productId: '11111111-1111-4111-8111-111111111111',
      sku: 'ZYV-PERF-JPG-ELIX-100',
      title: '100 ml',
      pricePesos: 250000,
      promotionalPricePesos: 225000,
      optionValues: { Presentacion: '100 ml' },
      weightGrams: 450,
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.priceCentavos).toBe(25_000_000);
      expect(valid.data.promotionalPriceCentavos).toBe(22_500_000);
    }

    // Precio promocional mayor al regular -> inválido
    const invalidPromo = upsertVariantSchema.safeParse({
      productId: '11111111-1111-4111-8111-111111111111',
      sku: 'ZYV-PERF-JPG-ELIX-100',
      title: '100 ml',
      pricePesos: 250000,
      promotionalPricePesos: 260000,
    });
    expect(invalidPromo.success).toBe(false);
  });

  it('optimiza imágenes de catálogo a formato WebP con sharp', async () => {
    const rawPng = await sharp({
      create: {
        width: 2000,
        height: 1000,
        channels: 4,
        background: { r: 123, g: 25, b: 236, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const optimized = await optimizeProductImageToWebp(rawPng);
    expect(optimized.contentType).toBe('image/webp');
    expect(optimized.width).toBe(1600);
    expect(optimized.height).toBe(800);
    expect(optimized.buffer.byteLength).toBeGreaterThan(0);
  });

  it('impide ajustes manuales que dejen el stock físico por debajo del stock reservado', () => {
    // Stock actual: 3 en mano, 2 reservados -> máximo ajuste negativo permitido es 1
    expect(() =>
      computeNewOnHandAfterAdjustment({
        currentOnHand: 3,
        currentReserved: 2,
        movementType: 'manual_adjustment_out',
        quantity: 2,
      })
    ).toThrow(/reservas activas/);

    const validOut = computeNewOnHandAfterAdjustment({
      currentOnHand: 3,
      currentReserved: 2,
      movementType: 'manual_adjustment_out',
      quantity: 1,
    });
    expect(validOut.newOnHand).toBe(2);
    expect(validOut.quantityDelta).toBe(-1);
  });

  it('sincroniza el carrusel de imágenes al seleccionar una variante con foto propia (Punto 7)', () => {
    const images: CarouselImageItem[] = [
      {
        id: 'img-1',
        variantId: 'var-blk',
        publicUrl: '/products/technology/Parlante Bluetooth portátil JBL GO 4 Negro.webp',
        altText: 'JBL GO 4 Negro',
        isPrimary: true,
        sortOrder: 0,
      },
      {
        id: 'img-2',
        variantId: 'var-red',
        publicUrl: '/products/technology/Parlante Bluetooth portátil JBL GO 4 Rojo.webp',
        altText: 'JBL GO 4 Rojo',
        isPrimary: false,
        sortOrder: 1,
      },
      {
        id: 'img-3',
        variantId: null,
        publicUrl: '/products/clothing/Remera Nike Pro Dri-FIT Tight Top Espalda.webp',
        altText: 'Espalda',
        isPrimary: false,
        sortOrder: 2,
      },
    ];

    // Al seleccionar la variante Roja ('var-red'), el carrusel salta al índice 1
    expect(resolveImageIndexForVariant(images, 'var-red', 0)).toBe(1);

    // Si la variante no tiene imagen específica (ej. talle en remera con fotos de frente y espalda), conserva el índice actual
    expect(resolveImageIndexForVariant(images, 'var-size-m', 2)).toBe(2);
  });
});
