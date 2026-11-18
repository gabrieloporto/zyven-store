'use server';

import { revalidatePath } from 'next/cache';
import { upsertCartItemServer } from './service';
import { ok, toActionError, type ActionResult } from '@/lib/errors';

export async function updateCartItemQuantityAction(input: {
  variantId: string;
  quantity: number;
}): Promise<ActionResult<{ cartId: string }>> {
  try {
    const res = await upsertCartItemServer(input);
    revalidatePath('/carrito');
    revalidatePath('/checkout');
    return ok(res);
  } catch (err) {
    return toActionError(err);
  }
}
