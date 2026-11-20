'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingBag,
  ArrowRight,
  Trash2,
  Plus,
  Minus,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { formatArs } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { useCart } from '@/components/storefront/CartProvider';

export default function CartPage() {
  const { cart, isPending, errorMessage, setItemQuantity, removeItem } =
    useCart();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#111111] sm:text-3xl">
            Carrito de Compras
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Revisá tus productos, ajustá las cantidades o avanzá al pago seguro.
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="mt-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {cart.items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 p-12 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-neutral-300" />
          <h2 className="mt-4 text-lg font-bold text-[#111111]">
            Tu carrito está vacío
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Explorá nuestro catálogo de perfumes, tecnología e indumentaria.
          </p>
          <Button asChild className="mt-6">
            <Link href="/productos">Ver catálogo</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {cart.items.map((item) => (
              <div
                key={item.itemId}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-4">
                  <Link
                    href={`/productos/${item.productSlug}`}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
                  >
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        sizes="96px"
                        className="object-contain p-1.5"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-300">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </Link>

                  <div>
                    <Link
                      href={`/productos/${item.productSlug}`}
                      className="text-base font-bold text-[#111111] hover:text-[#7B19EC]"
                    >
                      {item.productName}
                    </Link>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      Variante: <strong>{item.variantTitle}</strong> · SKU:{' '}
                      <span className="font-mono">{item.sku}</span>
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-neutral-700">
                      {formatArs(item.unitPriceCentavos)} c/u
                    </p>
                  </div>
                </div>

                {/* Controles +/- y botón Eliminar producto (Punto 4) */}
                <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-3 sm:border-t-0 sm:pt-0">
                  <div className="inline-flex items-center rounded-lg border border-neutral-300 bg-white">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        setItemQuantity(item.variantId, item.quantity - 1)
                      }
                      aria-label="Disminuir cantidad"
                      className="flex h-9 w-9 items-center justify-center text-[#111111] transition-colors hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center font-mono text-sm font-bold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={
                        isPending || item.quantity >= item.availableStock
                      }
                      onClick={() =>
                        setItemQuantity(item.variantId, item.quantity + 1)
                      }
                      aria-label="Aumentar cantidad"
                      className="flex h-9 w-9 items-center justify-center text-[#111111] transition-colors hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="min-w-28 text-right">
                    <p className="text-base font-bold text-[#111111]">
                      {formatArs(item.lineTotalCentavos)}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      Stock disp.: {item.availableStock}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => removeItem(item.variantId)}
                    aria-label={`Eliminar ${item.productName} del carrito`}
                    title="Eliminar producto"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <aside className="h-fit space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-bold text-[#111111]">
              Resumen de compra
            </h2>
            <div className="flex items-center justify-between text-sm text-neutral-600">
              <span>Subtotal ({cart.totalItemsCount} unidades)</span>
              <span className="font-semibold text-[#111111]">
                {formatArs(cart.subtotalCentavos)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
              <span className="text-base font-bold text-[#111111]">Total</span>
              <span className="text-xl font-bold text-[#7B19EC]">
                {formatArs(cart.subtotalCentavos - cart.discountCentavos)}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              El costo de envío se calcula en el siguiente paso según tu código
              postal.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href="/checkout">
                Continuar al Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/productos">Seguir comprando</Link>
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
