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

export interface CartDetailedView {
  cartId: string | null;
  items: Array<{
    itemId: string;
    variantId: string;
    productId: string;
    productName: string;
    productSlug: string;
    variantTitle: string;
    sku: string;
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
  }>;
  subtotalCentavos: number;
  discountCentavos: number;
  totalItemsCount: number;
}

export async function getActiveCartDetailed(): Promise<CartDetailedView> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      cartId: null,
      items: [],
      subtotalCentavos: 0,
      discountCentavos: 0,
      totalItemsCount: 0,
    };
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

    // Si existe un carrito de invitado en la sesión actual, sincronizar/fusionar al iniciar sesión (Sección 8)
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
  } else if (rawGuestToken) {
    const guestHash = hashGuestCartToken(rawGuestToken);
    const { data: guestCart } = await admin
      .from('carts')
      .select('id')
      .eq('guest_token_hash', guestHash)
      .maybeSingle();

    cartId = guestCart?.id ?? null;
  }

  if (!cartId) {
    return {
      cartId: null,
      items: [],
      subtotalCentavos: 0,
      discountCentavos: 0,
      totalItemsCount: 0,
    };
  }

  const { data: rawItems } = await admin
    .from('cart_items')
    .select(
      `
      id,
      quantity,
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
          lithium_battery_type
        ),
        inventory_levels(on_hand, reserved, available)
      )
    `
    )
    .eq('cart_id', cartId);

  const items: CartDetailedView['items'] = [];

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

export async function upsertCartItemServer(params: {
  variantId: string;
  quantity: number;
}): Promise<{ cartId: string }> {
  if (params.quantity < 0 || params.quantity > 50) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'Cantidad de producto fuera de rango permitido.',
    });
  }

  const admin = createSupabaseAdminClient();
  const profile = await getCurrentProfile();

  let cartId: string;

  if (profile) {
    const { data: existing } = await admin
      .from('carts')
      .select('id')
      .eq('user_id', profile.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      cartId = existing.id;
    } else {
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

  if (params.quantity === 0) {
    await admin
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId)
      .eq('variant_id', params.variantId);
    return { cartId };
  }

  // Verificar stock disponible real en servidor antes de agregar
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

  return { cartId };
}
