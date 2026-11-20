'use client';

import { useState } from 'react';
import {
  ProductImageCarousel,
  type CarouselImageItem,
} from './ProductImageCarousel';
import {
  VariantSelectorClient,
  type ClientVariantOption,
} from './VariantSelectorClient';
import { Badge } from '@/components/ui/badge';
import { Truck, ShieldCheck, Info } from 'lucide-react';

export function ProductDetailInteractive({
  productName,
  shortDescription,
  brandName,
  categoryName,
  containsFlammableLiquid,
  containsLithiumBattery,
  attributes,
  optionNames,
  variants,
  images,
}: {
  productName: string;
  shortDescription: string | null;
  brandName: string | null;
  categoryName: string | null;
  containsFlammableLiquid: boolean;
  containsLithiumBattery: boolean;
  attributes: Record<string, unknown>;
  optionNames: ReadonlyArray<string>;
  variants: ReadonlyArray<ClientVariantOption>;
  images: ReadonlyArray<CarouselImageItem>;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants[0]?.id ?? ''
  );

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      {/* Columna Izquierda: Carrusel de imágenes sincronizado con la variante activa */}
      <ProductImageCarousel
        images={images}
        productName={productName}
        selectedVariantId={selectedVariantId}
      />

      {/* Columna Derecha: Información comercial y selector de variantes */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            {brandName ? (
              <Badge variant="violetSoft">{brandName}</Badge>
            ) : null}
            {categoryName ? (
              <Badge variant="secondary">{categoryName}</Badge>
            ) : null}
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
            {productName}
          </h1>
          {shortDescription ? (
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              {shortDescription}
            </p>
          ) : null}
        </div>

        <VariantSelectorClient
          variants={variants}
          optionNames={optionNames}
          selectedVariantId={selectedVariantId}
          onSelectVariant={setSelectedVariantId}
        />

        {/* Avisos logísticos de transporte */}
        {containsFlammableLiquid || containsLithiumBattery ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-xs text-neutral-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#7B19EC]" />
            <span>
              Este artículo cuenta con embalaje protector reforzado y se
              despacha exclusivamente mediante modalidades terrestres
              habilitadas desde nuestro depósito en Alejandro Korn.
            </span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 border-t border-neutral-200 pt-5 text-xs text-neutral-600 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#7B19EC]" />
            <span>Despacho directo desde Alejandro Korn (CP 1864)</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#7B19EC]" />
            <span>Compra protegida con Mercado Pago</span>
          </div>
        </div>

        {/* Atributos flexibles del rubro */}
        {Object.keys(attributes).length > 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
              Especificaciones del producto
            </h2>
            <dl className="mt-3 divide-y divide-neutral-100 text-sm">
              {Object.entries(attributes).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between py-2"
                >
                  <dt className="capitalize text-neutral-500">
                    {k.replace(/_/g, ' ')}
                  </dt>
                  <dd className="font-medium text-[#111111]">
                    {typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </div>
  );
}
