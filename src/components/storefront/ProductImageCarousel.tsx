'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';

export interface CarouselImageItem {
  id: string;
  variantId: string | null;
  publicUrl: string;
  altText: string;
  isPrimary: boolean;
  sortOrder: number;
}

/**
 * Resuelve el índice de imagen activa cuando cambia la variante seleccionada.
 * Si existe una imagen vinculada al `variantId`, salta automáticamente a esa imagen.
 */
export function resolveImageIndexForVariant(
  images: ReadonlyArray<CarouselImageItem>,
  variantId: string | null | undefined,
  currentIndex: number
): number {
  if (images.length === 0) return 0;
  if (variantId) {
    const matchedIdx = images.findIndex((img) => img.variantId === variantId);
    if (matchedIdx !== -1) {
      return matchedIdx;
    }
  }
  return Math.min(Math.max(0, currentIndex), images.length - 1);
}

export function ProductImageCarousel({
  images,
  productName,
  selectedVariantId,
}: {
  images: ReadonlyArray<CarouselImageItem>;
  productName: string;
  selectedVariantId?: string | null;
}) {
  const [activeIndex, setActiveIndex] = useState<number>(() => {
    const primaryIdx = images.findIndex((img) => img.isPrimary);
    return primaryIdx >= 0 ? primaryIdx : 0;
  });

  // Sincronizar automáticamente cuando el usuario cambia de variante (ej. color en JBL GO 4 o conector en Cable)
  useEffect(() => {
    setActiveIndex((prev) =>
      resolveImageIndexForVariant(images, selectedVariantId, prev)
    );
  }, [selectedVariantId, images]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 text-neutral-400">
        <Package className="h-16 w-16 text-neutral-300" />
        <span className="text-sm font-medium">{productName}</span>
      </div>
    );
  }

  const currentImage = images[activeIndex] ?? images[0]!;
  const hasMultiple = images.length > 1;

  function goPrev() {
    setActiveIndex((idx) => (idx === 0 ? images.length - 1 : idx - 1));
  }

  function goNext() {
    setActiveIndex((idx) => (idx === images.length - 1 ? 0 : idx + 1));
  }

  return (
    <div className="space-y-4">
      {/* Visor principal del carrusel */}
      <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <Image
          key={currentImage.publicUrl}
          src={currentImage.publicUrl}
          alt={currentImage.altText || productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain p-6 transition-all duration-300"
        />

        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Imagen anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-[#111111] shadow-sm transition-all hover:border-[#7B19EC] hover:text-[#7B19EC] cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={goNext}
              aria-label="Siguiente imagen"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-[#111111] shadow-sm transition-all hover:border-[#7B19EC] hover:text-[#7B19EC] cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-3 right-3 rounded-full bg-[#111111]/80 px-3 py-1 font-mono text-xs font-semibold text-white">
              {activeIndex + 1} / {images.length}
            </div>
          </>
        ) : null}
      </div>

      {/* Tira de miniaturas (frente, espalda, colores, conectores) */}
      {hasMultiple ? (
        <div
          role="tablist"
          aria-label="Galería de imágenes del producto"
          className="flex gap-3 overflow-x-auto pb-1"
        >
          {images.map((img, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={img.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={img.altText || `Imagen ${idx + 1}`}
                onClick={() => setActiveIndex(idx)}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#7B19EC] ring-2 ring-[#7B19EC]/20'
                    : 'border-neutral-200 opacity-75 hover:border-neutral-400 hover:opacity-100'
                }`}
              >
                <Image
                  src={img.publicUrl}
                  alt={img.altText || `Miniatura ${idx + 1}`}
                  fill
                  sizes="80px"
                  className="object-contain p-1.5"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
