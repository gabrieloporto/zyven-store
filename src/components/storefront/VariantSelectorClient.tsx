'use client';

import { useState } from 'react';
import { ShoppingBag, Plus, Minus } from 'lucide-react';
import { formatArs } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from './CartProvider';

export interface ClientVariantOption {
  id: string;
  sku: string;
  title: string;
  optionValues: Record<string, string>;
  effectivePriceCentavos: number;
  compareAtPriceCentavos: number | null;
  discountPercentage: number | null;
  availableStock: number;
  isLowStock: boolean;
}

export function VariantSelectorClient({
  variants,
  optionNames = [],
  selectedVariantId,
  onSelectVariant,
}: {
  variants: ReadonlyArray<ClientVariantOption>;
  optionNames?: ReadonlyArray<string>;
  selectedVariantId?: string;
  onSelectVariant?: (variantId: string) => void;
}) {
  const { addItem, isPending } = useCart();
  const [internalSelectedId, setInternalSelectedId] = useState<string>(
    variants[0]?.id ?? ''
  );
  const [quantity, setQuantity] = useState<number>(1);

  const activeId = selectedVariantId ?? internalSelectedId;
  const selected =
    variants.find((v) => v.id === activeId) ?? variants[0] ?? null;

  if (!selected) return null;

  const inStock = selected.availableStock > 0;

  function selectVariant(id: string) {
    setInternalSelectedId(id);
    onSelectVariant?.(id);
    setQuantity(1);
  }

  function handleOptionAxisClick(axisName: string, value: string) {
    if (!selected) return;
    const desiredOptions = {
      ...selected.optionValues,
      [axisName]: value,
    };

    // Buscar variante que coincida con todos los ejes deseados o al menos con el eje recién elegido
    const exactMatch = variants.find((v) =>
      Object.entries(desiredOptions).every(
        ([k, val]) => v.optionValues[k] === val
      )
    );
    const partialMatch = variants.find(
      (v) => v.optionValues[axisName] === value
    );

    const target = exactMatch ?? partialMatch;
    if (target) {
      selectVariant(target.id);
    }
  }

  async function handleAddToCart() {
    if (!selected || !inStock) return;
    await addItem(selected.id, quantity, { openModal: true });
    setQuantity(1);
  }

  // Extraer valores únicos por eje (ej. Color: [Negro, Blanco...], Talle: [M, L...])
  const axesWithValues = optionNames
    .map((axis) => {
      const values = Array.from(
        new Set(
          variants
            .map((v) => v.optionValues[axis])
            .filter((val): val is string => Boolean(val))
        )
      );
      return { axis, values };
    })
    .filter((a) => a.values.length > 0);

  return (
    <div className="space-y-6">
      {/* Precio y SKU de la variante seleccionada */}
      <div className="space-y-2 border-b border-neutral-200 pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-neutral-500">
            SKU: {selected.sku}
          </span>
          {inStock ? (
            <Badge variant="success">
              En stock ({selected.availableStock} disp.)
            </Badge>
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

      {/* Selector por ejes (Color, Talle, Tipo de conector) cuando están definidos */}
      {axesWithValues.length > 0 ? (
        <div className="space-y-4">
          {axesWithValues.map(({ axis, values }) => (
            <div key={axis} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-neutral-600">
                  {axis}:{' '}
                  <strong className="text-[#111111]">
                    {selected.optionValues[axis] ?? selected.title}
                  </strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {values.map((val) => {
                  const isSelected = selected.optionValues[axis] === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleOptionAxisClick(axis, val)}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#7B19EC] bg-[#F3E8FF] text-[#7B19EC]'
                          : 'border-neutral-200 bg-white text-[#111111] hover:border-neutral-400'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : variants.length > 1 ? (
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
                  onClick={() => selectVariant(variant.id)}
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

      {/* Cantidad +/- y botón de compra (abre el modal de previsualización) */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="inline-flex h-12 items-center justify-between rounded-lg border border-neutral-300 bg-white sm:justify-start">
          <button
            type="button"
            disabled={!inStock || quantity <= 1 || isPending}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-full px-4 items-center justify-center text-[#111111] transition-colors hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
            aria-label="Disminuir cantidad"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center font-mono text-sm font-bold">
            {quantity}
          </span>
          <button
            type="button"
            disabled={
              !inStock || quantity >= selected.availableStock || isPending
            }
            onClick={() =>
              setQuantity((q) => Math.min(selected.availableStock, q + 1))
            }
            className="flex h-full px-4 items-center justify-center text-[#111111] transition-colors hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
            aria-label="Aumentar cantidad"
          >
            <Plus className="h-4 w-4" />
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
    </div>
  );
}
