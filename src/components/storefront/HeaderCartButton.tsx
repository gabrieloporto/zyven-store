'use client';

import { ShoppingBag } from 'lucide-react';
import { useCart } from './CartProvider';

export function HeaderCartButton() {
  const { cart, openCartModal } = useCart();

  return (
    <button
      type="button"
      onClick={openCartModal}
      aria-label={`Abrir vista rápida del carrito (${cart.totalItemsCount} productos)`}
      className="relative inline-flex h-10 items-center gap-2 rounded-lg bg-[#7B19EC] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#6612C9] cursor-pointer"
    >
      <ShoppingBag className="h-4 w-4" />
      <span>Carrito</span>
      {cart.totalItemsCount > 0 ? (
        <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 font-mono text-xs font-bold text-[#7B19EC]">
          {cart.totalItemsCount}
        </span>
      ) : null}
    </button>
  );
}
