import Link from 'next/link';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { formatArs } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import type { CatalogProductSummary } from '@/modules/products/queries';

export function ProductCard({ product }: { product: CatalogProductSummary }) {
  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all hover:border-[#7B19EC] hover:shadow-md">
      <Link
        href={`/productos/${product.slug}`}
        className="relative block aspect-square w-full overflow-hidden bg-neutral-100"
      >
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.primaryImageAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
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
          {!product.inStock ? (
            <Badge variant="secondary">Sin stock</Badge>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
            <span>{product.brandName ?? product.categoryName}</span>
            <span className="font-mono text-[11px] text-neutral-400">
              {product.defaultVariantSku}
            </span>
          </div>

          <h3 className="mt-1.5 line-clamp-2 text-sm font-bold text-[#111111] group-hover:text-[#7B19EC] transition-colors">
            <Link href={`/productos/${product.slug}`}>{product.name}</Link>
          </h3>
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-neutral-100 pt-3">
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
            className="inline-flex h-9 items-center rounded-lg bg-[#111111] px-3 text-xs font-semibold text-white transition-colors group-hover:bg-[#7B19EC]"
          >
            Ver detalle
          </Link>
        </div>
      </div>
    </article>
  );
}
