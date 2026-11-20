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

    revalidatePath('/productos');
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
