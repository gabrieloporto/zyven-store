'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminProfile } from '@/lib/security/auth-guards';
import { recordAuditLog } from '@/modules/admin/audit.service';
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
