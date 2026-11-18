'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatArs } from '@/lib/money';
import { updateCartItemQuantityAction } from '@/modules/cart/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface ClientVariantOption {
  id: string;
  sku: string;
  title: string;
  effectivePriceCentavos: number;
  compareAtPriceCentavos: number | null;
  discountPercentage: number | null;
  availableStock: number;
  isLowStock: boolean;
}

export function VariantSelectorClient({
  variants,
}: {
  variants: ReadonlyArray<ClientVariantOption>;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState<number>(1);
  const [feedback, setFeedback] = useState<{
    type: 'ok' | 'error';
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected =
    variants.find((v) => v.id === selectedId) ?? variants[0] ?? null;

  if (!selected) return null;

  const inStock = selected.availableStock > 0;

  function handleAddToCart() {
    if (!selected) return;
    setFeedback(null);

    startTransition(async () => {
      const res = await updateCartItemQuantityAction({
        variantId: selected.id,
        quantity,
      });

      if (!res.ok) {
        setFeedback({ type: 'error', text: res.error.message });
        return;
      }

      setFeedback({
        type: 'ok',
        text: 'Producto agregado a tu carrito.',
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Precio y SKU de la variante seleccionada */}
      <div className="space-y-2 border-b border-neutral-200 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-neutral-500">
            SKU: {selected.sku}
          </span>
          {inStock ? (
            <Badge variant="success">En stock ({selected.availableStock} disp.)</Badge>
          ) : (
            <Badge variant="secondary">Sin stock disponible</Badge>
          )}
          {selected.isLowStock && inStock ? (
            <Badge variant="warning">¡Últimas unidades!</Badge>
          ) : null}
        </div>

        <div className="flex items-baseline gap-3 pt-1">
          <span className="text-3xl font-bold tracking-tight text-[#111111]">
            {formatArs(selected.effectivePriceCentavos)}
          </span>
          {selected.compareAtPriceCentavos ? (
            <span className="text-base text-neutral-400 line-through">
              {formatArs(selected.compareAtPriceCentavos)}
            </span>
          ) : null}
          {selected.discountPercentage ? (
            <Badge variant="default">-{selected.discountPercentage}% OFF</Badge>
          ) : null}
        </div>
      </div>

      {/* Selector de variantes cuando hay más de una */}
      {variants.length > 1 ? (
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-600">
            Seleccionar variante
          </label>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => {
              const isSelected = variant.id === selected.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(variant.id);
                    setQuantity(1);
                    setFeedback(null);
                  }}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#7B19EC] bg-[#F3E8FF] text-[#7B19EC]'
                      : 'border-neutral-200 bg-white text-[#111111] hover:border-neutral-400'
                  }`}
                >
                  {variant.title}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Cantidad y botón de compra */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex items-center rounded-lg border border-neutral-300 bg-white">
          <button
            type="button"
            disabled={!inStock || quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="h-12 px-4 text-lg font-bold text-[#111111] disabled:opacity-40 cursor-pointer"
            aria-label="Disminuir cantidad"
          >
            −
          </button>
          <span className="w-12 text-center font-mono text-sm font-semibold">
            {quantity}
          </span>
          <button
            type="button"
            disabled={!inStock || quantity >= selected.availableStock}
            onClick={() =>
              setQuantity((q) => Math.min(selected.availableStock, q + 1))
            }
            className="h-12 px-4 text-lg font-bold text-[#111111] disabled:opacity-40 cursor-pointer"
            aria-label="Aumentar cantidad"
          >
            +
          </button>
        </div>

        <Button
          type="button"
          size="lg"
          disabled={!inStock || isPending}
          onClick={handleAddToCart}
          className="flex-1"
        >
          <ShoppingBag className="h-5 w-5" />
          {isPending
            ? 'Agregando...'
            : inStock
              ? 'Agregar al carrito'
              : 'Sin stock'}
        </Button>
      </div>

      {feedback ? (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl border p-3.5 text-sm ${
            feedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      ) : null}
    </div>
  );
}
