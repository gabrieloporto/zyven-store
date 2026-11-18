import { z } from 'zod';
import { pesosToCentavos } from '@/lib/money';

export const publicationStatusSchema = z.enum(['draft', 'active', 'archived']);

export const lithiumBatteryTypeSchema = z.enum([
  'none',
  'contained_in_equipment',
  'standalone_powerbank',
]);

export const upsertProductSchema = z
  .object({
    id: z.string().uuid().optional(),
    categoryId: z.string().uuid('Seleccioná una categoría válida.'),
    brandId: z.string().uuid().nullable().optional(),
    name: z
      .string()
      .trim()
      .min(3, 'El nombre del producto debe tener al menos 3 caracteres.')
      .max(160),
    slug: z
      .string()
      .trim()
      .min(3)
      .max(180)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'El slug solo puede contener letras minúsculas, números y guiones.'
      ),
    shortDescription: z.string().trim().max(300).optional(),
    description: z.string().trim().max(5000).optional(),
    status: publicationStatusSchema.default('draft'),
    isFeatured: z.boolean().default(false),
    hasVariants: z.boolean().default(false),
    optionNames: z.array(z.string().trim().min(1)).default([]),
    attributes: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .default({}),
    containsFlammableLiquid: z.boolean().default(false),
    containsLithiumBattery: z.boolean().default(false),
    lithiumBatteryType: lithiumBatteryTypeSchema.default('none'),
    requiresSpecialPackaging: z.boolean().default(false),
    commercialNameConfirmed: z.boolean().default(true),
    qualityReviewNotes: z.string().trim().max(500).nullable().optional(),
    seoTitle: z.string().trim().max(70).optional(),
    seoDescription: z.string().trim().max(160).optional(),
  })
  .superRefine((data, ctx) => {
    // Regla Sección 26.D: no permitir publicar un producto cuyo nombre comercial no esté confirmado
    if (data.status === 'active' && !data.commercialNameConfirmed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['status'],
        message:
          'No se puede publicar un producto mientras su nombre comercial esté pendiente de confirmar.',
      });
    }
    if (data.containsLithiumBattery && data.lithiumBatteryType === 'none') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lithiumBatteryType'],
        message:
          'Especificá el tipo de batería de litio (contenida en equipo o cargador portátil suelto) para evaluar restricciones logísticas.',
      });
    }
  });

export const upsertVariantSchema = z
  .object({
    id: z.string().uuid().optional(),
    productId: z.string().uuid(),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, 'El SKU debe tener al menos 3 caracteres.')
      .max(64)
      .regex(
        /^[A-Z0-9-_]+$/,
        'El SKU solo puede contener letras mayúsculas, números, guiones y guiones bajos.'
      ),
    title: z.string().trim().min(1, 'Ingresá el título de la variante.').max(100),
    isDefault: z.boolean().default(false),
    status: publicationStatusSchema.default('draft'),
    pricePesos: z
      .number()
      .positive('El precio debe ser mayor a $ 0.'),
    promotionalPricePesos: z
      .number()
      .positive('El precio promocional debe ser mayor a $ 0.')
      .nullable()
      .optional(),
    promoStartsAt: z.string().datetime().nullable().optional(),
    promoEndsAt: z.string().datetime().nullable().optional(),
    optionValues: z.record(z.string(), z.string()).default({}),
    weightGrams: z
      .number()
      .int()
      .positive('El peso en gramos debe ser mayor a 0.')
      .max(100_000)
      .default(250),
    heightCm: z.number().positive().max(200).default(10),
    widthCm: z.number().positive().max(200).default(10),
    depthCm: z.number().positive().max(200).default(10),
    barcode: z.string().trim().max(64).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.promotionalPricePesos != null &&
      data.promotionalPricePesos >= data.pricePesos
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['promotionalPricePesos'],
        message:
          'El precio promocional debe ser estrictamente menor al precio regular.',
      });
    }
  })
  .transform((data) => ({
    ...data,
    priceCentavos: pesosToCentavos(data.pricePesos),
    promotionalPriceCentavos:
      data.promotionalPricePesos != null
        ? pesosToCentavos(data.promotionalPricePesos)
        : null,
  }));

export type UpsertProductInput = z.input<typeof upsertProductSchema>;
export type UpsertVariantInput = z.input<typeof upsertVariantSchema>;
