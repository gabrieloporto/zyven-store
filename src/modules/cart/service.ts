import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/security/auth-guards';
import { resolveEffectivePriceCentavos, calculateOrderTotals } from '@/lib/money';
import { AppError } from '@/lib/errors';

const GUEST_CART_COOKIE = '__zyven_guest_cart';

export function hashGuestCartToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function getOrCreateGuestCartToken(): Promise<{
  rawToken: string;
  tokenHash: string;
}> {
  const cookieStore = await cookies();
  let rawToken = cookieStore.get(GUEST_CART_COOKIE)?.value;

  if (!rawToken || rawToken.length < 32) {
    rawToken = crypto.randomBytes(32).toString('hex');
    try {
      cookieStore.set(GUEST_CART_COOKIE, rawToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 días
      });
    } catch {
      // Ignorado si se invoca desde un Server Component puro de lectura
    }
  }

  return {
    rawToken,
    tokenHash: hashGuestCartToken(rawToken),
  };
}

export interface CartDetailedItem {
  itemId: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantTitle: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  unitPriceCentavos: number;
  compareAtPriceCentavos: number | null;
  lineTotalCentavos: number;
  availableStock: number;
  weightGrams: number;
  heightCm: number;
  widthCm: number;
  depthCm: number;
  containsFlammableLiquid: boolean;
  containsLithiumBattery: boolean;
  lithiumBatteryType: 'none' | 'contained_in_equipment' | 'standalone_powerbank';
}

export interface CartDetailedView {
  cartId: string | null;
  items: CartDetailedItem[];
  subtotalCentavos: number;
  discountCentavos: number;
  totalItemsCount: number;
}

async function resolveOrCreateActiveCartId(createIfMissing: boolean): Promise<string | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const profile = await getCurrentProfile();
  const cookieStore = await cookies();
  const rawGuestToken = cookieStore.get(GUEST_CART_COOKIE)?.value;

  let cartId: string | null = null;

  if (profile) {
    const { data: userCart } = await admin
      .from('carts')
      .select('id')
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    cartId = userCart?.id ?? null;

    if (rawGuestToken) {
      const guestHash = hashGuestCartToken(rawGuestToken);
      const { data: guestCart } = await admin
        .from('carts')
        .select('id')
        .eq('guest_token_hash', guestHash)
        .maybeSingle();

      if (guestCart && guestCart.id !== cartId) {
        if (!cartId) {
          await admin
            .from('carts')
            .update({ user_id: profile.id, guest_token_hash: null })
            .eq('id', guestCart.id);
          cartId = guestCart.id;
        } else {
          const { data: guestItems } = await admin
            .from('cart_items')
            .select('variant_id, quantity')
            .eq('cart_id', guestCart.id);

          for (const gItem of guestItems ?? []) {
            await admin.from('cart_items').upsert(
              {
                cart_id: cartId,
                variant_id: gItem.variant_id,
                quantity: gItem.quantity,
              },
              { onConflict: 'cart_id,variant_id' }
            );
          }
          await admin.from('carts').delete().eq('id', guestCart.id);
        }
      }
    }

    if (!cartId && createIfMissing) {
      const { data: created, error } = await admin
        .from('carts')
        .insert({ user_id: profile.id })
        .select('id')
        .single();
      if (error || !created) {
        throw new AppError({
          code: 'INTERNAL_ERROR',
          message: 'No se pudo inicializar el carrito.',
        });
      }
      cartId = created.id;
    }
  } else {
    if (rawGuestToken) {
      const guestHash = hashGuestCartToken(rawGuestToken);
      const { data: guestCart } = await admin
        .from('carts')
        .select('id')
        .eq('guest_token_hash', guestHash)
        .maybeSingle();

      cartId = guestCart?.id ?? null;
    }

    if (!cartId && createIfMissing) {
      const { tokenHash } = await getOrCreateGuestCartToken();
      const { data: existing } = await admin
        .from('carts')
        .select('id')
        .eq('guest_token_hash', tokenHash)
        .maybeSingle();

      if (existing) {
        cartId = existing.id;
      } else {
        const { data: created, error } = await admin
          .from('carts')
          .insert({ guest_token_hash: tokenHash })
          .select('id')
          .single();
        if (error || !created) {
          throw new AppError({
            code: 'INTERNAL_ERROR',
            message: 'No se pudo inicializar el carrito de invitado.',
          });
        }
        cartId = created.id;
      }
    }
  }

  return cartId;
}

export async function getActiveCartDetailed(): Promise<CartDetailedView> {
  const cartId = await resolveOrCreateActiveCartId(false);

  if (!cartId) {
    return {
      cartId: null,
      items: [],
      subtotalCentavos: 0,
      discountCentavos: 0,
      totalItemsCount: 0,
    };
  }

  const admin = createSupabaseAdminClient();

  const { data: rawItems } = await admin
    .from('cart_items')
    .select(
      `
      id,
      quantity,
      created_at,
      product_variants!inner(
        id,
        product_id,
        sku,
        title,
        status,
        price_centavos,
        promotional_price_centavos,
        promo_starts_at,
        promo_ends_at,
        weight_grams,
        height_cm,
        width_cm,
        depth_cm,
        products!inner(
          id,
          name,
          slug,
          status,
          contains_flammable_liquid,
          contains_lithium_battery,
          lithium_battery_type,
          product_images(public_url, variant_id, is_primary, sort_order)
        ),
        inventory_levels(on_hand, reserved, available)
      )
    `
    )
    .eq('cart_id', cartId)
    .order('created_at', { ascending: true });

  const items: CartDetailedItem[] = [];

  for (const row of rawItems ?? []) {
    const v = Array.isArray(row.product_variants)
      ? row.product_variants[0]
      : row.product_variants;
    if (!v || v.status !== 'active') continue;

    const p = Array.isArray(v.products) ? v.products[0] : v.products;
    if (!p || p.status !== 'active') continue;

    const inv = Array.isArray(v.inventory_levels)
      ? v.inventory_levels[0]
      : v.inventory_levels;
    const availableStock = Math.max(0, inv?.available ?? 0);

    const imgs: Array<{
      public_url: string;
      variant_id: string | null;
      is_primary: boolean;
      sort_order: number;
    }> = Array.isArray(p.product_images) ? p.product_images : [];
    const variantSpecificImg = imgs.find((img) => img.variant_id === v.id);
    const primaryImg = imgs.find((img) => img.is_primary) ?? imgs[0] ?? null;
    const chosenImgUrl =
      variantSpecificImg?.public_url ?? primaryImg?.public_url ?? null;

    const priceInfo = resolveEffectivePriceCentavos({
      priceCentavos: v.price_centavos,
      promotionalPriceCentavos: v.promotional_price_centavos,
      promoStartsAt: v.promo_starts_at,
      promoEndsAt: v.promo_ends_at,
    });

    items.push({
      itemId: row.id,
      variantId: v.id,
      productId: p.id,
      productName: p.name,
      productSlug: p.slug,
      variantTitle: v.title,
      sku: v.sku,
      imageUrl: chosenImgUrl,
      quantity: row.quantity,
      unitPriceCentavos: priceInfo.effectivePriceCentavos,
      compareAtPriceCentavos: priceInfo.compareAtPriceCentavos,
      lineTotalCentavos: priceInfo.effectivePriceCentavos * row.quantity,
      availableStock,
      weightGrams: v.weight_grams,
      heightCm: Number(v.height_cm),
      widthCm: Number(v.width_cm),
      depthCm: Number(v.depth_cm),
      containsFlammableLiquid: p.contains_flammable_liquid,
      containsLithiumBattery: p.contains_lithium_battery,
      lithiumBatteryType: p.lithium_battery_type as
        | 'none'
        | 'contained_in_equipment'
        | 'standalone_powerbank',
    });
  }

  const totals = calculateOrderTotals({
    items: items.map((i) => ({
      unitPriceCentavos: i.unitPriceCentavos,
      quantity: i.quantity,
    })),
  });

  return {
    cartId,
    items,
    subtotalCentavos: totals.subtotalCentavos,
    discountCentavos: totals.discountCentavos,
    totalItemsCount: items.reduce((acc, i) => acc + i.quantity, 0),
  };
}

/**
 * Incrementa la cantidad de una variante en el carrito (ej. al pulsar "Agregar al carrito").
 */
export async function addCartItemServer(params: {
  variantId: string;
  quantityToAdd: number;
}): Promise<CartDetailedView> {
  if (
    !Number.isSafeInteger(params.quantityToAdd) ||
    params.quantityToAdd <= 0 ||
    params.quantityToAdd > 50
  ) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'La cantidad a agregar debe ser entre 1 y 50 unidades.',
    });
  }

  const cartId = await resolveOrCreateActiveCartId(true);
  if (!cartId) {
    throw new AppError({
      code: 'INTERNAL_ERROR',
      message: 'No se pudo acceder al servicio de carrito.',
    });
  }

  const admin = createSupabaseAdminClient();

  const [{ data: existingItem }, { data: inv }] = await Promise.all([
    admin
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('variant_id', params.variantId)
      .maybeSingle(),
    admin
      .from('inventory_levels')
      .select('available')
      .eq('variant_id', params.variantId)
      .maybeSingle(),
  ]);

  const available = inv?.available ?? 0;
  const currentQty = existingItem?.quantity ?? 0;
  const targetQty = currentQty + params.quantityToAdd;

  if (available <= 0) {
    throw new AppError({
      code: 'INSUFFICIENT_STOCK',
      message: 'Este producto no tiene stock disponible en este momento.',
    });
  }

  if (targetQty > available) {
    throw new AppError({
      code: 'INSUFFICIENT_STOCK',
      message:
        currentQty > 0
          ? `Ya tenés ${currentQty} u. en tu carrito y solo hay ${available} u. disponibles en stock.`
          : `Solo quedan ${available} unidades disponibles de este producto.`,
    });
  }

  const { error } = await admin.from('cart_items').upsert(
    {
      cart_id: cartId,
      variant_id: params.variantId,
      quantity: targetQty,
    },
    { onConflict: 'cart_id,variant_id' }
  );

  if (error) {
    throw new AppError({
      code: 'INTERNAL_ERROR',
      message: 'No se pudo agregar el producto al carrito.',
    });
  }

  return getActiveCartDetailed();
}

/**
 * Fija la cantidad exacta de una variante en el carrito (controles +/-) o la elimina si quantity === 0.
 */
export async function upsertCartItemServer(params: {
  variantId: string;
  quantity: number;
}): Promise<CartDetailedView> {
  if (
    !Number.isSafeInteger(params.quantity) ||
    params.quantity < 0 ||
    params.quantity > 50
  ) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'Cantidad de producto fuera de rango permitido.',
    });
  }

  const cartId = await resolveOrCreateActiveCartId(true);
  if (!cartId) {
    throw new AppError({
      code: 'INTERNAL_ERROR',
      message: 'No se pudo acceder al servicio de carrito.',
    });
  }

  const admin = createSupabaseAdminClient();

  if (params.quantity === 0) {
    await admin
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId)
      .eq('variant_id', params.variantId);
    return getActiveCartDetailed();
  }

  const { data: inv } = await admin
    .from('inventory_levels')
    .select('available')
    .eq('variant_id', params.variantId)
    .maybeSingle();

  const available = inv?.available ?? 0;
  if (available < params.quantity) {
    throw new AppError({
      code: 'INSUFFICIENT_STOCK',
      message: `Solo quedan ${available} unidades disponibles de este producto.`,
    });
  }

  const { error: upsertErr } = await admin.from('cart_items').upsert(
    {
      cart_id: cartId,
      variant_id: params.variantId,
      quantity: params.quantity,
    },
    { onConflict: 'cart_id,variant_id' }
  );

  if (upsertErr) {
    throw new AppError({
      code: 'INTERNAL_ERROR',
      message: 'No se pudo actualizar el carrito.',
    });
  }

  return getActiveCartDetailed();
}
