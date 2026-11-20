'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, ShoppingBag, Plus, Minus } from 'lucide-react';
import { formatArs } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { useCart } from './CartProvider';
import type { CatalogProductSummary } from '@/modules/products/queries';

export function ProductCard({ product }: { product: CatalogProductSummary }) {
  const { addItem, isPending } = useCart();
  const [qty, setQty] = useState(1);

  const maxQty = Math.max(1, product.availableQty);

  async function handleQuickAdd() {
    if (!product.inStock) return;
    await addItem(product.defaultVariantId, qty, { openModal: true });
    setQty(1);
  }

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all hover:border-[#7B19EC] hover:shadow-md">
      <Link
        href={`/productos/${product.slug}`}
        className="relative block aspect-square w-full overflow-hidden bg-neutral-50 p-4"
      >
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.primaryImageAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-400">
            <Package className="h-10 w-10 text-neutral-300" />
            <span className="text-xs font-medium">{product.categoryName}</span>
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.discountPercentage ? (
            <Badge variant="default">-{product.discountPercentage}%</Badge>
          ) : null}
          {product.hasVariants ? (
            <Badge variant="violetSoft">Varias opciones</Badge>
          ) : null}
          {!product.inStock ? (
            <Badge variant="secondary">Sin stock</Badge>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
            <span className="font-medium">
              {product.brandName ?? product.categoryName}
            </span>
            <span className="font-mono text-[11px] text-neutral-400">
              {product.defaultVariantSku}
            </span>
          </div>

          <h3 className="mt-1.5 line-clamp-2 text-sm font-bold text-[#111111] transition-colors group-hover:text-[#7B19EC]">
            <Link href={`/productos/${product.slug}`}>{product.name}</Link>
          </h3>
        </div>

        <div className="mt-4 space-y-3 border-t border-neutral-100 pt-3">
          <div className="flex items-baseline justify-between">
            <div>
              {product.compareAtPriceCentavos ? (
                <p className="text-xs text-neutral-400 line-through">
                  {formatArs(product.compareAtPriceCentavos)}
                </p>
              ) : null}
              <p className="text-lg font-bold tracking-tight text-[#111111]">
                {formatArs(product.effectivePriceCentavos)}
              </p>
            </div>
            <Link
              href={`/productos/${product.slug}`}
              className="text-xs font-semibold text-[#7B19EC] hover:underline"
            >
              Ver detalle
            </Link>
          </div>

          {/* Controles +/- y botón Agregar al Carrito (Puntos 3 y 4) */}
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 items-center rounded-lg border border-neutral-300 bg-white">
              <button
                type="button"
                disabled={!product.inStock || qty <= 1 || isPending}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Restar cantidad"
                className="flex h-full w-7 items-center justify-center text-[#111111] transition-colors hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-7 text-center font-mono text-xs font-bold">
                {qty}
              </span>
              <button
                type="button"
                disabled={!product.inStock || qty >= maxQty || isPending}
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                aria-label="Sumar cantidad"
                className="flex h-full w-7 items-center justify-center text-[#111111] transition-colors hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            <button
              type="button"
              disabled={!product.inStock || isPending}
              onClick={handleQuickAdd}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#7B19EC] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#6612C9] disabled:bg-neutral-200 disabled:text-neutral-500 cursor-pointer"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>{product.inStock ? 'Agregar' : 'Sin stock'}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
