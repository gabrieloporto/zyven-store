import Link from 'next/link';
import { ShieldCheck, Lock } from 'lucide-react';
import { getActiveCartDetailed } from '@/modules/cart/service';
import { formatArs } from '@/lib/money';
import { Button } from '@/components/ui/button';

export default async function CheckoutPage() {
  const cart = await getActiveCartDetailed();

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[#111111]">
          No tenés productos en el carrito para iniciar el checkout
        </h1>
        <Button asChild className="mt-6">
          <Link href="/productos">Volver al catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">
            Finalizar Compra
          </h1>
          <p className="text-sm text-neutral-600">
            Tus precios, stock y costos de envío se verifican en nuestro
            servidor antes de redirigirte a Mercado Pago.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <Lock className="h-4 w-4" />
          Checkout Seguro
        </span>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-[#111111]">
            Datos del comprador y entrega
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Completá tus datos para calcular el envío desde Alejandro Korn (CP
            1864) y reservar tu stock por 30 minutos.
          </p>
        </div>

        <aside className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 space-y-4 h-fit">
          <h2 className="text-base font-bold text-[#111111]">
            Artículos ({cart.totalItemsCount})
          </h2>
          <ul className="divide-y divide-neutral-200 text-sm">
            {cart.items.map((item) => (
              <li
                key={item.itemId}
                className="flex items-center justify-between py-2.5"
              >
                <span>
                  {item.productName} × {item.quantity}
                </span>
                <span className="font-semibold">
                  {formatArs(item.lineTotalCentavos)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-neutral-200 pt-3 flex items-center justify-between font-bold">
            <span>Subtotal</span>
            <span className="text-lg text-[#7B19EC]">
              {formatArs(cart.subtotalCentavos)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <ShieldCheck className="h-4 w-4 text-[#7B19EC]" />
            <span>Procesado por Mercado Pago Checkout Pro</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
