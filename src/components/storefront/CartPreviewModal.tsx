'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  X,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { formatArs } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { useCart } from './CartProvider';

export function CartPreviewModal() {
  const router = useRouter();
  const {
    cart,
    isModalOpen,
    isPending,
    errorMessage,
    closeCartModal,
    setItemQuantity,
    removeItem,
  } = useCart();

  function handleFinishPurchase() {
    closeCartModal();
    router.push('/carrito');
  }

  return (
    <Dialog.Root
      open={isModalOpen}
      onOpenChange={(open) => {
        if (!open) closeCartModal();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white text-[#111111] shadow-2xl focus:outline-none"
        >
          {/* Cabecera del Modal */}
          <div className="flex items-center justify-between border-b border-neutral-200 bg-[#111111] px-6 py-4 text-white">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="h-5 w-5 text-[#7B19EC]" />
              <Dialog.Title className="text-base font-bold">
                Mi Carrito ({cart.totalItemsCount})
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="Cerrar previsualización del carrito"
              className="rounded-lg p-1.5 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          {/* Mensaje de error si excede stock */}
          {errorMessage ? (
            <div
              role="alert"
              className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {/* Lista de productos agregados */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {cart.items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <p className="mt-4 text-base font-bold text-[#111111]">
                  Tu carrito está vacío
                </p>
                <p className="mt-1 max-w-xs text-xs text-neutral-500">
                  Agregá perfumes, tecnología o indumentaria para verlos acá.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-6"
                >
                  <Link href="/productos" onClick={closeCartModal}>
                    Explorar productos
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-200">
                {cart.items.map((item) => (
                  <li key={item.itemId} className="flex gap-4 py-4">
                    {/* Miniatura del producto/variante */}
                    <Link
                      href={`/productos/${item.productSlug}`}
                      onClick={closeCartModal}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          fill
                          sizes="80px"
                          className="object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-300">
                          <Package className="h-6 w-6" />
                        </div>
                      )}
                    </Link>

                    {/* Detalle y controles +/- y eliminar */}
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/productos/${item.productSlug}`}
                            onClick={closeCartModal}
                            className="line-clamp-2 text-sm font-bold text-[#111111] hover:text-[#7B19EC]"
                          >
                            {item.productName}
                          </Link>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {item.variantTitle}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => removeItem(item.variantId)}
                          aria-label={`Eliminar ${item.productName} del carrito`}
                          className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 cursor-pointer"
                          title="Eliminar producto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        {/* Controles +/- */}
                        <div className="inline-flex items-center rounded-lg border border-neutral-300 bg-white">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              setItemQuantity(item.variantId, item.quantity - 1)
                            }
                            aria-label="Restar una unidad"
                            className="flex h-8 w-8 items-center justify-center text-[#111111] transition-colors hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center font-mono text-xs font-bold">
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
                            aria-label="Sumar una unidad"
                            className="flex h-8 w-8 items-center justify-center text-[#111111] transition-colors hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-[#111111]">
                            {formatArs(item.lineTotalCentavos)}
                          </p>
                          {item.quantity > 1 ? (
                            <p className="text-[11px] text-neutral-400">
                              {formatArs(item.unitPriceCentavos)} c/u
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pie del Modal con Subtotal y Botón Finalizar Compra -> /carrito */}
          {cart.items.length > 0 ? (
            <div className="border-t border-neutral-200 bg-neutral-50 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-600">
                  Subtotal ({cart.totalItemsCount}{' '}
                  {cart.totalItemsCount === 1 ? 'unidad' : 'unidades'})
                </span>
                <span className="text-xl font-bold text-[#111111]">
                  {formatArs(cart.subtotalCentavos)}
                </span>
              </div>

              <p className="text-xs text-neutral-500">
                El costo de envío se calcula al avanzar con tu compra.
              </p>

              <div className="flex flex-col gap-2.5">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleFinishPurchase}
                  className="w-full"
                >
                  <span>Finalizar compra</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={closeCartModal}
                  className="w-full"
                >
                  Seguir comprando
                </Button>
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
