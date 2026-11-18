import Link from 'next/link';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { getActiveCartDetailed } from '@/modules/cart/service';
import { formatArs } from '@/lib/money';
import { Button } from '@/components/ui/button';

export default async function CartPage() {
  const cart = await getActiveCartDetailed();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[#111111] sm:text-3xl">
        Carrito de Compras
      </h1>

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
                className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5"
              >
                <div>
                  <Link
                    href={`/productos/${item.productSlug}`}
                    className="font-bold text-[#111111] hover:text-[#7B19EC]"
                  >
                    {item.productName}
                  </Link>
                  <p className="text-xs text-neutral-500">
                    Variante: {item.variantTitle} · SKU: {item.sku}
                  </p>
                  <p className="mt-1 text-sm font-medium text-neutral-700">
                    {formatArs(item.unitPriceCentavos)} × {item.quantity} u.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-base font-bold text-[#111111]">
                    {formatArs(item.lineTotalCentavos)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <aside className="rounded-2xl border border-neutral-200 bg-white p-6 h-fit space-y-4">
            <h2 className="text-lg font-bold text-[#111111]">
              Resumen de compra
            </h2>
            <div className="flex items-center justify-between text-sm text-neutral-600">
              <span>Subtotal ({cart.totalItemsCount} productos)</span>
              <span className="font-semibold text-[#111111]">
                {formatArs(cart.subtotalCentavos)}
              </span>
            </div>
            <div className="border-t border-neutral-200 pt-4 flex items-center justify-between">
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
          </aside>
        </div>
      )}
    </div>
  );
}
