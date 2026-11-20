'use server';

import { revalidatePath } from 'next/cache';
import {
  addCartItemServer,
  upsertCartItemServer,
  getActiveCartDetailed,
  type CartDetailedView,
} from './service';
import { ok, toActionError, type ActionResult } from '@/lib/errors';

export async function getCartStateAction(): Promise<
  ActionResult<CartDetailedView>
> {
  try {
    const cart = await getActiveCartDetailed();
    return ok(cart);
  } catch (err) {
    return toActionError(err);
  }
}

export async function addToCartAction(input: {
  variantId: string;
  quantityToAdd: number;
}): Promise<ActionResult<CartDetailedView>> {
  try {
    const cart = await addCartItemServer(input);
    revalidatePath('/carrito');
    revalidatePath('/checkout');
    return ok(cart);
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateCartItemQuantityAction(input: {
  variantId: string;
  quantity: number;
}): Promise<ActionResult<CartDetailedView>> {
  try {
    const cart = await upsertCartItemServer(input);
    revalidatePath('/carrito');
    revalidatePath('/checkout');
    return ok(cart);
  } catch (err) {
    return toActionError(err);
  }
}

export async function removeCartItemAction(input: {
  variantId: string;
}): Promise<ActionResult<CartDetailedView>> {
  try {
    const cart = await upsertCartItemServer({
      variantId: input.variantId,
      quantity: 0,
    });
    revalidatePath('/carrito');
    revalidatePath('/checkout');
    return ok(cart);
  } catch (err) {
    return toActionError(err);
  }
}
