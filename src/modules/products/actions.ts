'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdminProfile } from '@/lib/security/auth-guards';
import { recordAuditLog } from '@/modules/admin/audit.service';
import { optimizeProductImageToWebp } from './image-optimizer';
import { slugify } from '@/lib/utils';
import { pesosToCentavos } from '@/lib/money';
import {
  upsertProductSchema,
  upsertVariantSchema,
  type UpsertProductInput,
  type UpsertVariantInput,
} from './schema';
import {
  inventoryAdjustmentSchema,
  computeNewOnHandAfterAdjustment,
  type InventoryAdjustmentInput,
} from '@/modules/inventory/schema';
import { ok, fail, toActionError, type ActionResult } from '@/lib/errors';
import type { Json } from '@/lib/supabase/database.types';

export async function upsertProductAction(
  input: UpsertProductInput
): Promise<ActionResult<{ productId: string }>> {
  try {
    const adminProfile = await requireAdminProfile();
    const parsed = upsertProductSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Datos del producto inválidos.'
      );
    }

    const d = parsed.data;
    const supabase = await createSupabaseServerClient();

    const payload = {
      category_id: d.categoryId,
      brand_id: d.brandId ?? null,
      name: d.name,
      slug: d.slug,
      short_description: d.shortDescription ?? null,
      description: d.description ?? null,
      status: d.status,
      is_featured: d.isFeatured,
      has_variants: d.hasVariants,
      option_names: d.optionNames as unknown as Json,
      attributes: d.attributes as unknown as Json,
      contains_flammable_liquid: d.containsFlammableLiquid,
      contains_lithium_battery: d.containsLithiumBattery,
      lithium_battery_type: d.lithiumBatteryType,
      requires_special_packaging:
        d.requiresSpecialPackaging ||
        d.containsFlammableLiquid ||
        d.containsLithiumBattery,
      commercial_name_confirmed: d.commercialNameConfirmed,
      quality_review_notes: d.qualityReviewNotes ?? null,
      seo_title: d.seoTitle ?? null,
      seo_description: d.seoDescription ?? null,
    };

    let productId = d.id;

    if (productId) {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', productId);

      if (error) {
        return fail('CONFLICT', `No se pudo actualizar el producto: ${error.message}`);
      }
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select('id')
        .single();

      if (error || !data) {
        return fail('CONFLICT', `No se pudo crear el producto: ${error?.message ?? ''}`);
      }
      productId = data.id;
    }

    await recordAuditLog({
      actorUserId: adminProfile.id,
      actorRole: adminProfile.role,
      action: d.id ? 'product.updated' : 'product.created',
      entityType: 'product',
      entityId: productId,
      afterState: payload,
    });

    revalidatePath('/productos');
    revalidatePath(`/productos/${d.slug}`);
    revalidatePath('/admin/productos');

    return ok({ productId });
  } catch (err) {
    return toActionError(err);
  }
}

export async function upsertVariantAction(
  input: UpsertVariantInput
): Promise<ActionResult<{ variantId: string }>> {
  try {
    const adminProfile = await requireAdminProfile();
    const parsed = upsertVariantSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Datos de la variante inválidos.'
      );
    }

    const d = parsed.data;
    const supabase = await createSupabaseServerClient();

    const payload = {
      product_id: d.productId,
      sku: d.sku,
      title: d.title,
      is_default: d.isDefault,
      status: d.status,
      price_centavos: d.priceCentavos,
      promotional_price_centavos: d.promotionalPriceCentavos,
      promo_starts_at: d.promoStartsAt ?? null,
      promo_ends_at: d.promoEndsAt ?? null,
      option_values: d.optionValues as unknown as Json,
      weight_grams: d.weightGrams,
      height_cm: d.heightCm,
      width_cm: d.widthCm,
      depth_cm: d.depthCm,
      barcode: d.barcode ?? null,
    };

    let variantId = d.id;

    if (variantId) {
      const { error } = await supabase
        .from('product_variants')
        .update(payload)
        .eq('id', variantId);

      if (error) {
        return fail('CONFLICT', `Error al actualizar variante: ${error.message}`);
      }
    } else {
      const { data, error } = await supabase
        .from('product_variants')
        .insert(payload)
        .select('id')
        .single();

      if (error || !data) {
        return fail('CONFLICT', `Error al crear variante: ${error?.message ?? ''}`);
      }
      variantId = data.id;

      // Inicializar fila de inventario en depósito ALEJANDRO_KORN
      const { data: wh } = await supabase
        .from('warehouses')
        .select('id')
        .eq('code', 'ALEJANDRO_KORN')
        .single();

      if (wh) {
        await supabase.from('inventory_levels').insert({
          variant_id: variantId,
          warehouse_id: wh.id,
          on_hand: 0,
          reserved: 0,
        });
      }
    }

    await recordAuditLog({
      actorUserId: adminProfile.id,
      actorRole: adminProfile.role,
      action: d.id ? 'variant.updated' : 'variant.created',
      entityType: 'product_variant',
      entityId: variantId,
      afterState: payload,
    });

    revalidatePath('/productos');
    revalidatePath('/admin/productos');
    revalidatePath('/admin/inventario');

    return ok({ variantId });
  } catch (err) {
    return toActionError(err);
  }
}

export async function recordInventoryAdjustmentAction(
  input: InventoryAdjustmentInput
): Promise<ActionResult<{ newOnHand: number; available: number }>> {
  try {
    const adminProfile = await requireAdminProfile();
    const parsed = inventoryAdjustmentSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Datos de ajuste inválidos.'
      );
    }

    const d = parsed.data;
    const supabase = await createSupabaseServerClient();

    const { data: inv, error: invError } = await supabase
      .from('inventory_levels')
      .select('*')
      .eq('variant_id', d.variantId)
      .single();

    if (invError || !inv) {
      return fail('NOT_FOUND', 'Nivel de inventario no encontrado para esta variante.');
    }

    let calc: { quantityDelta: number; newOnHand: number };
    try {
      calc = computeNewOnHandAfterAdjustment({
        currentOnHand: inv.on_hand,
        currentReserved: inv.reserved,
        movementType: d.movementType,
        quantity: d.quantity,
      });
    } catch (e) {
      return fail(
        'CONFLICT',
        e instanceof Error ? e.message : 'Ajuste de stock inválido.'
      );
    }

    const { error: movError } = await supabase
      .from('inventory_movements')
      .insert({
        variant_id: d.variantId,
        warehouse_id: inv.warehouse_id,
        movement_type: d.movementType,
        quantity_delta: calc.quantityDelta,
        on_hand_before: inv.on_hand,
        on_hand_after: calc.newOnHand,
        reserved_before: inv.reserved,
        reserved_after: inv.reserved,
        reference_type: 'manual_adjustment',
        idempotency_key: d.idempotencyKey,
        reason: d.reason,
        actor_user_id: adminProfile.id,
      });

    if (movError) {
      return fail(
        'CONFLICT',
        'Este ajuste ya fue registrado previamente (idempotencia) o no pudo guardarse.'
      );
    }

    const { error: updError } = await supabase
      .from('inventory_levels')
      .update({
        on_hand: calc.newOnHand,
        low_stock_threshold: d.lowStockThreshold ?? inv.low_stock_threshold,
      })
      .eq('variant_id', d.variantId);

    if (updError) {
      return fail('INTERNAL_ERROR', `No se pudo actualizar el stock: ${updError.message}`);
    }

    await recordAuditLog({
      actorUserId: adminProfile.id,
      actorRole: adminProfile.role,
      action: `inventory.${d.movementType}`,
      entityType: 'inventory_level',
      entityId: d.variantId,
      beforeState: { on_hand: inv.on_hand, reserved: inv.reserved },
      afterState: { on_hand: calc.newOnHand, reserved: inv.reserved },
      metadata: { reason: d.reason, quantityDelta: calc.quantityDelta },
    });

    revalidatePath('/');
    revalidatePath('/productos', 'layout');
    revalidatePath('/admin/productos', 'layout');
    revalidatePath('/admin/inventario');
    revalidatePath('/admin');

    return ok({
      newOnHand: calc.newOnHand,
      available: calc.newOnHand - inv.reserved,
    });
  } catch (err) {
    return toActionError(err);
  }
}

export async function toggleProductPublicationAction(input: {
  productId: string;
  targetStatus: 'draft' | 'active';
}): Promise<ActionResult<{ status: 'draft' | 'active' }>> {
  try {
    const adminProfile = await requireAdminProfile();
    const supabase = await createSupabaseServerClient();

    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('id, slug, status, commercial_name_confirmed')
      .eq('id', input.productId)
      .single();

    if (prodErr || !product) {
      return fail('NOT_FOUND', 'Producto no encontrado.');
    }

    if (input.targetStatus === 'active' && !product.commercial_name_confirmed) {
      return fail(
        'VALIDATION_ERROR',
        'No se puede publicar un producto cuyo nombre comercial aún no fue confirmado.'
      );
    }

    const { error: updProdErr } = await supabase
      .from('products')
      .update({ status: input.targetStatus })
      .eq('id', product.id);

    if (updProdErr) {
      return fail('CONFLICT', `No se pudo cambiar el estado: ${updProdErr.message}`);
    }

    await supabase
      .from('product_variants')
      .update({ status: input.targetStatus })
      .eq('product_id', product.id);

    await recordAuditLog({
      actorUserId: adminProfile.id,
      actorRole: adminProfile.role,
      action: 'product.status_changed',
      entityType: 'product',
      entityId: product.id,
      beforeState: { status: product.status },
      afterState: { status: input.targetStatus },
    });

    revalidatePath('/');
    revalidatePath('/productos');
    revalidatePath(`/productos/${product.slug}`);
    revalidatePath('/admin/productos');
    revalidatePath('/admin');

    return ok({ status: input.targetStatus });
  } catch (err) {
    return toActionError(err);
  }
}

/**
 * Sube una imagen de producto (frente, espalda, detalle o variante de color/talle),
 * la optimiza a WebP con `sharp` y la agrega al carrusel del producto (`public.product_images`).
 */
export async function uploadProductImageAction(formData: FormData): Promise<
  ActionResult<{ imageId: string; publicUrl: string }>
> {
  try {
    const adminProfile = await requireAdminProfile();
    const productId = String(formData.get('productId') ?? '').trim();
    const variantIdRaw = String(formData.get('variantId') ?? '').trim();
    const altText = String(formData.get('altText') ?? '').trim();
    const sortOrder = Number(formData.get('sortOrder') ?? '0') || 0;
    const isPrimary = formData.get('isPrimary') === 'true';
    const file = formData.get('file');

    if (!productId || !(file instanceof File)) {
      return fail(
        'VALIDATION_ERROR',
        'Seleccioná un producto y un archivo de imagen válido.'
      );
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const optimized = await optimizeProductImageToWebp(rawBuffer);

    const admin = createSupabaseAdminClient();
    const storagePath = `products/${productId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.webp`;

    const { error: uploadErr } = await admin.storage
      .from('product-media')
      .upload(storagePath, optimized.buffer, {
        contentType: 'image/webp',
        upsert: false,
      });

    if (uploadErr) {
      return fail(
        'INTERNAL_ERROR',
        `Error al subir imagen a Storage: ${uploadErr.message}`
      );
    }

    const {
      data: { publicUrl },
    } = admin.storage.from('product-media').getPublicUrl(storagePath);

    if (isPrimary) {
      await admin
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);
    }

    const { data: createdImg, error: dbErr } = await admin
      .from('product_images')
      .insert({
        product_id: productId,
        variant_id: variantIdRaw.length > 0 ? variantIdRaw : null,
        storage_path: storagePath,
        public_url: publicUrl,
        alt_text: altText || 'Imagen de producto Zyven Store',
        width: optimized.width,
        height: optimized.height,
        sort_order: sortOrder,
        is_primary: isPrimary,
      })
      .select('id')
      .single();

    if (dbErr || !createdImg) {
      return fail(
        'INTERNAL_ERROR',
        `No se pudo registrar la imagen en el carrusel: ${dbErr?.message ?? ''}`
      );
    }

    await recordAuditLog({
      actorUserId: adminProfile.id,
      actorRole: adminProfile.role,
      action: 'product.image_uploaded',
      entityType: 'product_image',
      entityId: createdImg.id,
      afterState: {
        productId,
        variantId: variantIdRaw || null,
        publicUrl,
        sortOrder,
        isPrimary,
      },
    });

    revalidatePath('/');
    revalidatePath('/productos');
    revalidatePath('/admin/productos');
    revalidatePath(`/admin/productos/${productId}`);

    return ok({ imageId: createdImg.id, publicUrl });
  } catch (err) {
    return toActionError(err);
  }
}

interface NewProductVariantDraft {
  sku: string;
  title: string;
  pricePesos: number;
  promotionalPricePesos?: number | null;
  initialStock: number;
  weightGrams: number;
  optionValues?: Record<string, string>;
}

/**
 * Crea un producto completo desde el Panel Admin (datos generales, marca nueva opcional,
 * 1 o más variantes con stock inicial en ALEJANDRO_KORN e imágenes múltiples optimizadas a WebP).
 */
export async function createCompleteProductAction(
  formData: FormData
): Promise<ActionResult<{ productId: string; slug: string }>> {
  try {
    const adminProfile = await requireAdminProfile();
    const admin = createSupabaseAdminClient();

    const name = String(formData.get('name') ?? '').trim();
    const rawSlug = String(formData.get('slug') ?? '').trim();
    const slug = slugify(rawSlug || name);
    const categoryId = String(formData.get('categoryId') ?? '').trim();
    const brandIdRaw = String(formData.get('brandId') ?? '').trim();
    const newBrandName = String(formData.get('newBrandName') ?? '').trim();
    const shortDescription = String(formData.get('shortDescription') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const statusRaw = String(formData.get('status') ?? 'draft');
    const status: 'draft' | 'active' =
      statusRaw === 'active' ? 'active' : 'draft';
    const isFeatured = formData.get('isFeatured') === 'true';
    const containsFlammableLiquid =
      formData.get('containsFlammableLiquid') === 'true';
    const containsLithiumBattery =
      formData.get('containsLithiumBattery') === 'true';
    const lithiumBatteryTypeRaw = String(
      formData.get('lithiumBatteryType') ?? 'none'
    );
    const lithiumBatteryType = containsLithiumBattery
      ? lithiumBatteryTypeRaw === 'standalone_powerbank'
        ? 'standalone_powerbank'
        : 'contained_in_equipment'
      : 'none';

    const optionNamesRaw = String(formData.get('optionNames') ?? '[]');
    const variantsJsonRaw = String(formData.get('variantsJson') ?? '[]');

    if (name.length < 3 || !slug || !categoryId) {
      return fail(
        'VALIDATION_ERROR',
        'Completá el nombre del producto y seleccioná una categoría válida.'
      );
    }

    let optionNames: string[] = [];
    let variantsDraft: NewProductVariantDraft[] = [];
    try {
      optionNames = JSON.parse(optionNamesRaw) as string[];
      variantsDraft = JSON.parse(variantsJsonRaw) as NewProductVariantDraft[];
    } catch {
      return fail('VALIDATION_ERROR', 'Formato de variantes inválido.');
    }

    if (!Array.isArray(variantsDraft) || variantsDraft.length === 0) {
      return fail(
        'VALIDATION_ERROR',
        'El producto debe tener al menos una variante con SKU y precio.'
      );
    }

    for (const v of variantsDraft) {
      if (!v.sku || v.sku.trim().length < 3) {
        return fail(
          'VALIDATION_ERROR',
          'Cada variante debe tener un SKU único de al menos 3 caracteres.'
        );
      }
      if (!Number.isFinite(v.pricePesos) || v.pricePesos <= 0) {
        return fail(
          'VALIDATION_ERROR',
          `El precio de la variante "${v.title || v.sku}" debe ser mayor a $ 0.`
        );
      }
      if (
        v.promotionalPricePesos != null &&
        v.promotionalPricePesos >= v.pricePesos
      ) {
        return fail(
          'VALIDATION_ERROR',
          `El precio promocional de "${v.title || v.sku}" debe ser menor al precio regular.`
        );
      }
      if (!Number.isInteger(v.initialStock) || v.initialStock < 0) {
        return fail(
          'VALIDATION_ERROR',
          `El stock inicial de "${v.title || v.sku}" debe ser un entero mayor o igual a 0.`
        );
      }
    }

    // Resolver o crear marca si se ingresó una nueva
    let resolvedBrandId: string | null = brandIdRaw || null;
    if (!resolvedBrandId && newBrandName.length >= 2) {
      const brandSlug = slugify(newBrandName);
      const { data: existingBrand } = await admin
        .from('brands')
        .select('id')
        .eq('slug', brandSlug)
        .maybeSingle();

      if (existingBrand) {
        resolvedBrandId = existingBrand.id;
      } else {
        const { data: createdBrand, error: brandErr } = await admin
          .from('brands')
          .insert({ name: newBrandName, slug: brandSlug, is_active: true })
          .select('id')
          .single();
        if (brandErr || !createdBrand) {
          return fail(
            'CONFLICT',
            `No se pudo crear la marca "${newBrandName}": ${brandErr?.message ?? ''}`
          );
        }
        resolvedBrandId = createdBrand.id;
      }
    }

    // Obtener depósito principal ALEJANDRO_KORN
    const { data: warehouse } = await admin
      .from('warehouses')
      .select('id')
      .eq('code', 'ALEJANDRO_KORN')
      .single();

    if (!warehouse) {
      return fail(
        'INTERNAL_ERROR',
        'No se encontró el depósito principal ALEJANDRO_KORN.'
      );
    }

    // 1. Insertar producto
    const { data: createdProduct, error: prodErr } = await admin
      .from('products')
      .insert({
        category_id: categoryId,
        brand_id: resolvedBrandId,
        name,
        slug,
        short_description: shortDescription || null,
        description: description || null,
        status,
        is_featured: isFeatured,
        has_variants: variantsDraft.length > 1 || optionNames.length > 0,
        option_names: optionNames as unknown as Json,
        attributes: {} as unknown as Json,
        contains_flammable_liquid: containsFlammableLiquid,
        contains_lithium_battery: containsLithiumBattery,
        lithium_battery_type: lithiumBatteryType,
        requires_special_packaging:
          containsFlammableLiquid || containsLithiumBattery,
        commercial_name_confirmed: true,
      })
      .select('id, slug')
      .single();

    if (prodErr || !createdProduct) {
      return fail(
        'CONFLICT',
        `No se pudo crear el producto (verificá que el slug no esté duplicado): ${prodErr?.message ?? ''}`
      );
    }

    // 2. Insertar variantes e inventario inicial
    for (let i = 0; i < variantsDraft.length; i += 1) {
      const v = variantsDraft[i]!;
      const normalizedSku = v.sku.trim().toUpperCase();
      const priceCentavos = pesosToCentavos(v.pricePesos);
      const promoCentavos =
        v.promotionalPricePesos != null && v.promotionalPricePesos > 0
          ? pesosToCentavos(v.promotionalPricePesos)
          : null;

      const { data: createdVar, error: varErr } = await admin
        .from('product_variants')
        .insert({
          product_id: createdProduct.id,
          sku: normalizedSku,
          title: v.title.trim() || 'Estándar',
          is_default: i === 0,
          status,
          price_centavos: priceCentavos,
          promotional_price_centavos: promoCentavos,
          option_values: (v.optionValues ?? {}) as unknown as Json,
          weight_grams: Math.max(10, Math.round(v.weightGrams || 250)),
          sort_order: i + 1,
        })
        .select('id')
        .single();

      if (varErr || !createdVar) {
        await admin.from('products').delete().eq('id', createdProduct.id);
        return fail(
          'CONFLICT',
          `Error creando variante con SKU "${normalizedSku}" (verificá que el SKU sea único): ${varErr?.message ?? ''}`
        );
      }

      await admin.from('inventory_levels').insert({
        variant_id: createdVar.id,
        warehouse_id: warehouse.id,
        on_hand: v.initialStock,
        reserved: 0,
        low_stock_threshold: 2,
      });

      if (v.initialStock > 0) {
        await admin.from('inventory_movements').insert({
          variant_id: createdVar.id,
          warehouse_id: warehouse.id,
          movement_type: 'purchase_entry',
          quantity_delta: v.initialStock,
          on_hand_before: 0,
          on_hand_after: v.initialStock,
          reserved_before: 0,
          reserved_after: 0,
          reference_type: 'manual_adjustment',
          idempotency_key: `init-prod:${createdVar.id}`,
          reason: 'Stock inicial al dar de alta el producto en panel admin',
          actor_user_id: adminProfile.id,
        });
      }
    }

    // 3. Procesar y subir imágenes múltiples al bucket público product-media (convertidas a WebP con sharp)
    const imageFiles = formData
      .getAll('images')
      .filter((item): item is File => item instanceof File && item.size > 0);

    for (let idx = 0; idx < imageFiles.length; idx += 1) {
      const file = imageFiles[idx]!;
      const rawBuffer = Buffer.from(await file.arrayBuffer());
      const optimized = await optimizeProductImageToWebp(rawBuffer);

      const storagePath = `products/${createdProduct.id}/${Date.now()}-${idx}.webp`;
      const { error: uploadErr } = await admin.storage
        .from('product-media')
        .upload(storagePath, optimized.buffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (!uploadErr) {
        const {
          data: { publicUrl },
        } = admin.storage.from('product-media').getPublicUrl(storagePath);

        await admin.from('product_images').insert({
          product_id: createdProduct.id,
          variant_id: null,
          storage_path: storagePath,
          public_url: publicUrl,
          alt_text:
            imageFiles.length > 1 ? `${name} — Vista ${idx + 1}` : name,
          width: optimized.width,
          height: optimized.height,
          sort_order: idx,
          is_primary: idx === 0,
        });
      }
    }

    await recordAuditLog({
      actorUserId: adminProfile.id,
      actorRole: adminProfile.role,
      action: 'product.created_complete',
      entityType: 'product',
      entityId: createdProduct.id,
      afterState: {
        name,
        slug: createdProduct.slug,
        status,
        variantsCount: variantsDraft.length,
        imagesCount: imageFiles.length,
      },
    });

    revalidatePath('/');
    revalidatePath('/productos');
    revalidatePath(`/productos/${createdProduct.slug}`);
    revalidatePath('/admin/productos');
    revalidatePath('/admin/inventario');
    revalidatePath('/admin');

    return ok({ productId: createdProduct.id, slug: createdProduct.slug });
  } catch (err) {
    return toActionError(err);
  }
}

async function syncProductVariantMetadata(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  productId: string
): Promise<void> {
  const { data: variants } = await admin
    .from('product_variants')
    .select('id, status, option_values')
    .eq('product_id', productId)
    .neq('status', 'archived');

  const activeList = variants ?? [];
  const preferredOrder = ['Talle', 'Color', 'Conector'];
  const keysSet = new Set<string>();

  for (const v of activeList) {
    const ov = v.option_values;
    if (ov && typeof ov === 'object' && !Array.isArray(ov)) {
      for (const [k, val] of Object.entries(ov)) {
        if (typeof val === 'string' && val.trim().length > 0) {
          keysSet.add(k);
        }
      }
    }
  }

  const orderedKeys = [
    ...preferredOrder.filter((k) => keysSet.has(k)),
    ...[...keysSet].filter((k) => !preferredOrder.includes(k)),
  ];

  await admin
    .from('products')
    .update({
      has_variants: activeList.length > 1 || orderedKeys.length > 0,
      option_names: orderedKeys as unknown as Json,
    })
    .eq('id', productId);
}

export async function updateProductDetailsAction(input: {
  productId: string;
  name: string;
  slug: string;
  categoryId: string;
  brandId: string | null;
  newBrandName?: string;
  shortDescription?: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  isFeatured: boolean;
  containsFlammableLiquid: boolean;
  containsLithiumBattery: boolean;
  lithiumBatteryType: 'none' | 'contained_in_equipment' | 'standalone_powerbank';
}): Promise<ActionResult<{ productId: string; slug: string }>> {
  try {
    const adminProfile = await requireAdminProfile();
    const admin = createSupabaseAdminClient();

    const name = input.name.trim();
    const slug = slugify(input.slug.trim() || name);
    const categoryId = input.categoryId.trim();

    if (name.length < 3 || !slug || !categoryId) {
      return fail(
        'VALIDATION_ERROR',
        'Completá el nombre comercial, slug y categoría válidos.'
      );
    }

    const { data: existing, error: fetchErr } = await admin
      .from('products')
      .select('id, slug, status')
      .eq('id', input.productId)
      .single();

    if (fetchErr || !existing) {
      return fail('NOT_FOUND', 'Producto no encontrado.');
    }

    let resolvedBrandId: string | null = input.brandId?.trim() || null;
    const newBrandName = (input.newBrandName ?? '').trim();
    if (!resolvedBrandId && newBrandName.length >= 2) {
      const brandSlug = slugify(newBrandName);
      const { data: existingBrand } = await admin
        .from('brands')
        .select('id')
        .eq('slug', brandSlug)
        .maybeSingle();

      if (existingBrand) {
        resolvedBrandId = existingBrand.id;
      } else {
        const { data: createdBrand, error: brandErr } = await admin
          .from('brands')
          .insert({ name: newBrandName, slug: brandSlug, is_active: true })
          .select('id')
          .single();

        if (brandErr || !createdBrand) {
          return fail(
            'CONFLICT',
            `No se pudo crear la marca "${newBrandName}": ${brandErr?.message ?? ''}`
          );
        }
        resolvedBrandId = createdBrand.id;
      }
    }

    const lithiumBatteryType = input.containsLithiumBattery
      ? input.lithiumBatteryType === 'standalone_powerbank'
        ? 'standalone_powerbank'
        : 'contained_in_equipment'
      : 'none';

    const payload = {
      name,
      slug,
      category_id: categoryId,
      brand_id: resolvedBrandId,
      short_description: input.shortDescription?.trim() || null,
      description: input.description?.trim() || null,
      status: input.status,
      is_featured: input.isFeatured,
      contains_flammable_liquid: input.containsFlammableLiquid,
      contains_lithium_battery: input.containsLithiumBattery,
      lithium_battery_type: lithiumBatteryType,
      requires_special_packaging:
        input.containsFlammableLiquid || input.containsLithiumBattery,
      commercial_name_confirmed: true,
    };

    const { error: updErr } = await admin
      .from('products')
      .update(payload)
      .eq('id', input.productId);

    if (updErr) {
      return fail(
        'CONFLICT',
        `No se pudo guardar el producto (verificá que el slug no esté duplicado): ${updErr.message}`
      );
    }

    await recordAuditLog({
      actorUserId: adminProfile.id,
      actorRole: adminProfile.role,
      action: 'product.updated',
      entityType: 'product',
      entityId: input.productId,
      beforeState: { slug: existing.slug, status: existing.status },
      afterState: payload,
    });

    revalidatePath('/');
    revalidatePath('/productos');
    revalidatePath(`/productos/${existing.slug}`);
    revalidatePath(`/productos/${slug}`);
    revalidatePath('/admin/productos');
    revalidatePath(`/admin/productos/${input.productId}`);
    revalidatePath('/admin');

    return ok({ productId: input.productId, slug });
  } catch (err) {
    return toActionError(err);
  }
}

export async function saveProductVariantAction(input: {
  id?: string;
  productId: string;
  sku: string;
  title: string;
  pricePesos: number;
  promotionalPricePesos: number | null;
  status: 'draft' | 'active' | 'archived';
  weightGrams: number;
  optionValues: Record<string, string>;
  initialStock?: number;
}): Promise<ActionResult<{ variantId: string }>> {
  try {
    const adminProfile = await requireAdminProfile();
    const admin = createSupabaseAdminClient();

    const normalizedSku = input.sku.trim().toUpperCase();
    const title = input.title.trim();

    if (normalizedSku.length < 3 || !/^[A-Z0-9-_]+$/.test(normalizedSku)) {
      return fail(
        'VALIDATION_ERROR',
        'El SKU debe tener al menos 3 caracteres (solo letras mayúsculas, números, guiones o guiones bajos).'
      );
    }

    if (!title) {
      return fail('VALIDATION_ERROR', 'Ingresá un título para la variante.');
    }

    if (!Number.isFinite(input.pricePesos) || input.pricePesos <= 0) {
      return fail('VALIDATION_ERROR', 'El precio regular debe ser mayor a $ 0.');
    }

    if (
      input.promotionalPricePesos != null &&
      (!Number.isFinite(input.promotionalPricePesos) ||
        input.promotionalPricePesos <= 0 ||
        input.promotionalPricePesos >= input.pricePesos)
    ) {
      return fail(
        'VALIDATION_ERROR',
        'El precio promocional debe ser mayor a $ 0 y menor al precio regular.'
      );
    }

    const cleanOptionValues: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.optionValues ?? {})) {
      const key = k.trim();
      const val = v.trim();
      if (key && val) {
        cleanOptionValues[key] = val;
      }
    }

    const priceCentavos = pesosToCentavos(input.pricePesos);
    const promotionalPriceCentavos =
      input.promotionalPricePesos != null
        ? pesosToCentavos(input.promotionalPricePesos)
        : null;
    const weightGrams = Math.max(10, Math.round(input.weightGrams || 250));

    let variantId = input.id;

    if (variantId) {
      const { error: updErr } = await admin
        .from('product_variants')
        .update({
          sku: normalizedSku,
          title,
          status: input.status,
          price_centavos: priceCentavos,
          promotional_price_centavos: promotionalPriceCentavos,
          option_values: cleanOptionValues as unknown as Json,
          weight_grams: weightGrams,
        })
        .eq('id', variantId)
        .eq('product_id', input.productId);

      if (updErr) {
        return fail(
          'CONFLICT',
          `No se pudo actualizar la variante (verificá que el SKU "${normalizedSku}" sea único): ${updErr.message}`
        );
      }
    } else {
      const initialStock = Math.max(0, Math.floor(input.initialStock ?? 0));

      const { count } = await admin
        .from('product_variants')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', input.productId);

      const { data: created, error: createErr } = await admin
        .from('product_variants')
        .insert({
          product_id: input.productId,
          sku: normalizedSku,
          title,
          is_default: (count ?? 0) === 0,
          status: input.status,
          price_centavos: priceCentavos,
          promotional_price_centavos: promotionalPriceCentavos,
          option_values: cleanOptionValues as unknown as Json,
          weight_grams: weightGrams,
          sort_order: (count ?? 0) + 1,
        })
        .select('id')
        .single();

      if (createErr || !created) {
        return fail(
          'CONFLICT',
          `No se pudo crear la variante (verificá que el SKU "${normalizedSku}" sea único): ${createErr?.message ?? ''}`
        );
      }
      variantId = created.id;

      const { data: warehouse } = await admin
        .from('warehouses')
        .select('id')
        .eq('code', 'ALEJANDRO_KORN')
        .single();

      if (warehouse) {
        await admin.from('inventory_levels').insert({
          variant_id: variantId,
          warehouse_id: warehouse.id,
          on_hand: initialStock,
          reserved: 0,
          low_stock_threshold: 2,
        });

        if (initialStock > 0) {
          await admin.from('inventory_movements').insert({
            variant_id: variantId,
            warehouse_id: warehouse.id,
            movement_type: 'purchase_entry',
            quantity_delta: initialStock,
            on_hand_before: 0,
            on_hand_after: initialStock,
            reserved_before: 0,
            reserved_after: 0,
            reference_type: 'manual_adjustment',
            idempotency_key: `init-var:${variantId}`,
            reason: 'Stock inicial al crear variante desde edición de producto',
            actor_user_id: adminProfile.id,
          });
        }
      }
    }

    await syncProductVariantMetadata(admin, input.productId);

    const { data: prod } = await admin
      .from('products')
      .select('slug')
      .eq('id', input.productId)
      .single();

    await recordAuditLog({
      actorUserId: adminProfile.id,
      actorRole: adminProfile.role,
      action: input.id ? 'variant.updated' : 'variant.created',
      entityType: 'product_variant',
      entityId: variantId,
      afterState: {
        sku: normalizedSku,
        title,
        status: input.status,
        priceCentavos,
        promotionalPriceCentavos,
        optionValues: cleanOptionValues,
      },
    });

    revalidatePath('/');
    revalidatePath('/productos');
    if (prod?.slug) revalidatePath(`/productos/${prod.slug}`);
    revalidatePath('/admin/productos');
    revalidatePath(`/admin/productos/${input.productId}`);
    revalidatePath('/admin/inventario');

    return ok({ variantId });
  } catch (err) {
    return toActionError(err);
  }
}

export async function toggleVariantStatusAction(input: {
  productId: string;
  variantId: string;
  targetStatus: 'active' | 'archived';
}): Promise<ActionResult<{ status: 'active' | 'archived' }>> {
  try {
    const adminProfile = await requireAdminProfile();
    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from('product_variants')
      .update({ status: input.targetStatus })
      .eq('id', input.variantId)
      .eq('product_id', input.productId);

    if (error) {
      return fail('CONFLICT', `No se pudo cambiar el estado de la variante: ${error.message}`);
    }

    await syncProductVariantMetadata(admin, input.productId);

    const { data: prod } = await admin
      .from('products')
      .select('slug')
      .eq('id', input.productId)
      .single();

    await recordAuditLog({
      actorUserId: adminProfile.id,
      actorRole: adminProfile.role,
      action: 'variant.status_changed',
      entityType: 'product_variant',
      entityId: input.variantId,
      afterState: { status: input.targetStatus },
    });

    revalidatePath('/');
    revalidatePath('/productos');
    if (prod?.slug) revalidatePath(`/productos/${prod.slug}`);
    revalidatePath('/admin/productos');
    revalidatePath(`/admin/productos/${input.productId}`);
    revalidatePath('/admin/inventario');

    return ok({ status: input.targetStatus });
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteVariantAction(input: {
  productId: string;
  variantId: string;
}): Promise<ActionResult<{ deleted: true }>> {
  try {
    const adminProfile = await requireAdminProfile();
    const admin = createSupabaseAdminClient();

    const { count: totalVariants } = await admin
      .from('product_variants')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', input.productId);

    if ((totalVariants ?? 0) <= 1) {
      return fail(
        'CONFLICT',
        'El producto debe conservar al menos una variante. Si querés ocultarlo, pasá el producto a borrador.'
      );
    }

    const { count: salesCount } = await admin
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('variant_id', input.variantId);

    if ((salesCount ?? 0) > 0) {
      return fail(
        'CONFLICT',
        'Esta variante tiene ventas registradas y no se puede eliminar para preservar el historial contable. Podés desactivarla (archivarla) en su lugar.'
      );
    }

    const { data: inv } = await admin
      .from('inventory_levels')
      .select('reserved')
      .eq('variant_id', input.variantId)
      .maybeSingle();

    if ((inv?.reserved ?? 0) > 0) {
      return fail(
        'CONFLICT',
        'Esta variante tiene unidades reservadas en checkouts activos. Esperá a que expiren las reservas o desactivala.'
      );
    }

    // Desvincular imágenes asociadas a esta variante y limpiar referencias sin ventas
    await admin
      .from('product_images')
      .update({ variant_id: null })
      .eq('variant_id', input.variantId);

    await admin.from('cart_items').delete().eq('variant_id', input.variantId);
    await admin
      .from('stock_reservations')
      .delete()
      .eq('variant_id', input.variantId);
    await admin
      .from('inventory_movements')
      .delete()
      .eq('variant_id', input.variantId);
    await admin
      .from('inventory_levels')
      .delete()
      .eq('variant_id', input.variantId);

    const { error: delErr } = await admin
      .from('product_variants')
      .delete()
      .eq('id', input.variantId)
      .eq('product_id', input.productId);

    if (delErr) {
      return fail(
        'CONFLICT',
        `No se pudo eliminar la variante: ${delErr.message}`
      );
    }

    await syncProductVariantMetadata(admin, input.productId);

    const { data: prod } = await admin
      .from('products')
      .select('slug')
      .eq('id', input.productId)
      .single();

    await recordAuditLog({
      actorUserId: adminProfile.id,
      actorRole: adminProfile.role,
      action: 'variant.deleted',
      entityType: 'product_variant',
      entityId: input.variantId,
      metadata: { productId: input.productId },
    });

    revalidatePath('/');
    revalidatePath('/productos');
    if (prod?.slug) revalidatePath(`/productos/${prod.slug}`);
    revalidatePath('/admin/productos');
    revalidatePath(`/admin/productos/${input.productId}`);
    revalidatePath('/admin/inventario');

    return ok({ deleted: true });
  } catch (err) {
    return toActionError(err);
  }
}

export async function uploadProductImagesBatchAction(formData: FormData): Promise<
  ActionResult<{ uploadedCount: number }>
> {
  try {
    const adminProfile = await requireAdminProfile();
    const admin = createSupabaseAdminClient();

    const productId = String(formData.get('productId') ?? '').trim();
    const variantIdRaw = String(formData.get('variantId') ?? '').trim();
    const altTextBase = String(formData.get('altText') ?? '').trim();

    if (!productId) {
      return fail('VALIDATION_ERROR', 'Producto inválido.');
    }

    const files = formData
      .getAll('images')
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (files.length === 0) {
      return fail('VALIDATION_ERROR', 'Seleccioná al menos una imagen para subir.');
    }

    const { data: prod } = await admin
      .from('products')
      .select('name, slug')
      .eq('id', productId)
      .single();

    const { data: existingImgs } = await admin
      .from('product_images')
      .select('id, sort_order')
      .eq('product_id', productId)
      .order('sort_order', { ascending: false });

    const existingCount = existingImgs?.length ?? 0;
    const baseSortOrder =
      existingImgs && existingImgs.length > 0
        ? (existingImgs[0]?.sort_order ?? 0) + 1
        : 0;

    let uploadedCount = 0;

    for (let idx = 0; idx < files.length; idx += 1) {
      const file = files[idx]!;
      const rawBuffer = Buffer.from(await file.arrayBuffer());
      const optimized = await optimizeProductImageToWebp(rawBuffer);

      const storagePath = `products/${productId}/${Date.now()}-${idx}-${Math.random()
        .toString(36)
        .slice(2, 7)}.webp`;

      const { error: uploadErr } = await admin.storage
        .from('product-media')
        .upload(storagePath, optimized.buffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (uploadErr) {
        return fail(
          'INTERNAL_ERROR',
          `Error al subir imagen a Storage: ${uploadErr.message}`
        );
      }

      const {
        data: { publicUrl },
      } = admin.storage.from('product-media').getPublicUrl(storagePath);

      const { error: dbErr } = await admin.from('product_images').insert({
        product_id: productId,
        variant_id: variantIdRaw || null,
        storage_path: storagePath,
        public_url: publicUrl,
        alt_text:
          altTextBase ||
          `${prod?.name ?? 'Producto Zyven'} — Vista ${existingCount + idx + 1}`,
        width: optimized.width,
        height: optimized.height,
        sort_order: baseSortOrder + idx,
        is_primary: existingCount === 0 && idx === 0,
      });

      if (dbErr) {
        return fail(
          'INTERNAL_ERROR',
          `No se pudo guardar la imagen en la base de datos: ${dbErr.message}`
        );
      }
      uploadedCount += 1;
    }

    await recordAuditLog({
      actorUserId: adminProfile.id,
      actorRole: adminProfile.role,
      action: 'product.images_uploaded',
      entityType: 'product',
      entityId: productId,
      metadata: { uploadedCount, variantId: variantIdRaw || null },
    });

    revalidatePath('/');
    revalidatePath('/productos');
    if (prod?.slug) revalidatePath(`/productos/${prod.slug}`);
    revalidatePath('/admin/productos');
    revalidatePath(`/admin/productos/${productId}`);

    return ok({ uploadedCount });
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateProductImageMetaAction(input: {
  productId: string;
  imageId: string;
  variantId: string | null;
  altText: string;
}): Promise<ActionResult<{ imageId: string }>> {
  try {
    const adminProfile = await requireAdminProfile();
    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from('product_images')
      .update({
        variant_id: input.variantId || null,
        alt_text: input.altText.trim() || 'Imagen de producto Zyven Store',
      })
      .eq('id', input.imageId)
      .eq('product_id', input.productId);

    if (error) {
      return fail('CONFLICT', `No se pudo actualizar la imagen: ${error.message}`);
    }

    const { data: prod } = await admin
      .from('products')
      .select('slug')
      .eq('id', input.productId)
      .single();

    await recordAuditLog({
      actorUserId: adminProfile.id,
      actorRole: adminProfile.role,
      action: 'product.image_updated',
      entityType: 'product_image',
      entityId: input.imageId,
      afterState: {
        variantId: input.variantId || null,
        altText: input.altText.trim(),
      },
    });

    revalidatePath('/');
    revalidatePath('/productos');
    if (prod?.slug) revalidatePath(`/productos/${prod.slug}`);
    revalidatePath(`/admin/productos/${input.productId}`);

    return ok({ imageId: input.imageId });
  } catch (err) {
    return toActionError(err);
  }
}

export async function reorderProductImagesAction(input: {
  productId: string;
  orderedImageIds: string[];
}): Promise<ActionResult<{ reordered: true }>> {
  try {
    const adminProfile = await requireAdminProfile();
    const admin = createSupabaseAdminClient();

    for (let idx = 0; idx < input.orderedImageIds.length; idx += 1) {
      const imageId = input.orderedImageIds[idx]!;
      await admin
        .from('product_images')
        .update({
          sort_order: idx,
          is_primary: idx === 0,
        })
        .eq('id', imageId)
        .eq('product_id', input.productId);
    }

    const { data: prod } = await admin
      .from('products')
      .select('slug')
      .eq('id', input.productId)
      .single();

    await recordAuditLog({
      actorUserId: adminProfile.id,
      actorRole: adminProfile.role,
      action: 'product.images_reordered',
      entityType: 'product',
      entityId: input.productId,
      afterState: { orderedImageIds: input.orderedImageIds },
    });

    revalidatePath('/');
    revalidatePath('/productos');
    if (prod?.slug) revalidatePath(`/productos/${prod.slug}`);
    revalidatePath('/admin/productos');
    revalidatePath(`/admin/productos/${input.productId}`);

    return ok({ reordered: true });
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteProductImageAction(input: {
  productId: string;
  imageId: string;
}): Promise<ActionResult<{ deleted: true }>> {
  try {
    const adminProfile = await requireAdminProfile();
    const admin = createSupabaseAdminClient();

    const { data: img, error: fetchErr } = await admin
      .from('product_images')
      .select('id, storage_path, public_url, is_primary')
      .eq('id', input.imageId)
      .eq('product_id', input.productId)
      .single();

    if (fetchErr || !img) {
      return fail('NOT_FOUND', 'Imagen no encontrada.');
    }

    const { error: delErr } = await admin
      .from('product_images')
      .delete()
      .eq('id', input.imageId)
      .eq('product_id', input.productId);

    if (delErr) {
      return fail('INTERNAL_ERROR', `No se pudo eliminar la imagen: ${delErr.message}`);
    }

    // Si estaba alojada en Supabase Storage (product-media), eliminar el archivo del bucket
    if (
      img.storage_path &&
      !img.storage_path.startsWith('/') &&
      img.public_url.includes('/storage/v1/object/public/product-media/')
    ) {
      await admin.storage.from('product-media').remove([img.storage_path]);
    }

    // Si era la imagen principal, promover la primera restante a portada
    if (img.is_primary) {
      const { data: nextImg } = await admin
        .from('product_images')
        .select('id')
        .eq('product_id', input.productId)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextImg) {
        await admin
          .from('product_images')
          .update({ is_primary: true })
          .eq('id', nextImg.id);
      }
    }

    const { data: prod } = await admin
      .from('products')
      .select('slug')
      .eq('id', input.productId)
      .single();

    await recordAuditLog({
      actorUserId: adminProfile.id,
      actorRole: adminProfile.role,
      action: 'product.image_deleted',
      entityType: 'product_image',
      entityId: input.imageId,
      beforeState: {
        storagePath: img.storage_path,
        publicUrl: img.public_url,
      },
    });

    revalidatePath('/');
    revalidatePath('/productos');
    if (prod?.slug) revalidatePath(`/productos/${prod.slug}`);
    revalidatePath('/admin/productos');
    revalidatePath(`/admin/productos/${input.productId}`);

    return ok({ deleted: true });
  } catch (err) {
    return toActionError(err);
  }
}
