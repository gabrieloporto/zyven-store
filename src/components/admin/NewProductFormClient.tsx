'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  UploadCloud,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { createCompleteProductAction } from '@/modules/products/actions';
import { slugify } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface BrandOption {
  id: string;
  name: string;
  slug: string;
}

interface VariantRowState {
  key: string;
  sku: string;
  title: string;
  pricePesos: string;
  promotionalPricePesos: string;
  initialStock: string;
  weightGrams: string;
  color: string;
  size: string;
}

export function NewProductFormClient({
  categories,
  brands,
}: {
  categories: ReadonlyArray<CategoryOption>;
  brands: ReadonlyArray<BrandOption>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Datos principales
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [brandId, setBrandId] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'active'>('draft');
  const [isFeatured, setIsFeatured] = useState(false);

  // Restricciones logísticas
  const [containsFlammableLiquid, setContainsFlammableLiquid] = useState(false);
  const [containsLithiumBattery, setContainsLithiumBattery] = useState(false);
  const [lithiumBatteryType, setLithiumBatteryType] = useState<
    'contained_in_equipment' | 'standalone_powerbank'
  >('contained_in_equipment');

  // Variantes dinámicas
  const [variants, setVariants] = useState<VariantRowState[]>([
    {
      key: 'var-1',
      sku: '',
      title: 'Estándar',
      pricePesos: '',
      promotionalPricePesos: '',
      initialStock: '1',
      weightGrams: '300',
      color: '',
      size: '',
    },
  ]);

  // Imágenes múltiples para el carrusel
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSlug, setSuccessSlug] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function addVariantRow() {
    setVariants((prev) => [
      ...prev,
      {
        key: `var-${Date.now()}-${prev.length + 1}`,
        sku: '',
        title: '',
        pricePesos: prev[0]?.pricePesos ?? '',
        promotionalPricePesos: '',
        initialStock: '1',
        weightGrams: prev[0]?.weightGrams ?? '300',
        color: '',
        size: '',
      },
    ]);
  }

  function removeVariantRow(key: string) {
    setVariants((prev) =>
      prev.length > 1 ? prev.filter((v) => v.key !== key) : prev
    );
  }

  function updateVariantField(
    key: string,
    field: keyof VariantRowState,
    value: string
  ) {
    setVariants((prev) =>
      prev.map((v) => (v.key === key ? { ...v, [field]: value } : v))
    );
  }

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setSelectedFiles(files);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessSlug(null);

    const hasColorAxis = variants.some((v) => v.color.trim().length > 0);
    const hasSizeAxis = variants.some((v) => v.size.trim().length > 0);
    const optionNames: string[] = [];
    if (hasSizeAxis) optionNames.push('Talle');
    if (hasColorAxis) optionNames.push('Color');

    const variantsPayload = variants.map((v) => {
      const optionValues: Record<string, string> = {};
      if (v.size.trim()) optionValues.Talle = v.size.trim();
      if (v.color.trim()) optionValues.Color = v.color.trim();

      const autoTitle =
        v.title.trim() ||
        [v.size.trim() ? `Talle ${v.size.trim()}` : '', v.color.trim()]
          .filter(Boolean)
          .join(' · ') ||
        'Estándar';

      return {
        sku: v.sku.trim().toUpperCase(),
        title: autoTitle,
        pricePesos: Number(v.pricePesos),
        promotionalPricePesos: v.promotionalPricePesos
          ? Number(v.promotionalPricePesos)
          : null,
        initialStock: Number(v.initialStock || '0'),
        weightGrams: Number(v.weightGrams || '300'),
        optionValues,
      };
    });

    const formData = new FormData();
    formData.set('name', name);
    formData.set('slug', slug);
    formData.set('categoryId', categoryId);
    formData.set('brandId', brandId);
    formData.set('newBrandName', newBrandName);
    formData.set('shortDescription', shortDescription);
    formData.set('description', description);
    formData.set('status', status);
    formData.set('isFeatured', String(isFeatured));
    formData.set('containsFlammableLiquid', String(containsFlammableLiquid));
    formData.set('containsLithiumBattery', String(containsLithiumBattery));
    formData.set('lithiumBatteryType', lithiumBatteryType);
    formData.set('optionNames', JSON.stringify(optionNames));
    formData.set('variantsJson', JSON.stringify(variantsPayload));

    for (const file of selectedFiles) {
      formData.append('images', file);
    }

    startTransition(async () => {
      const res = await createCompleteProductAction(formData);
      if (!res.ok) {
        setErrorMessage(res.error.message);
        return;
      }
      setSuccessSlug(res.data.slug);
      router.push('/admin/productos');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/admin/productos"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-[#7B19EC]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al listado de productos
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[#111111]">
            Agregar Nuevo Producto
          </h1>
          <p className="text-sm text-neutral-600">
            Cargá los datos comerciales, variantes con stock propio en Alejandro
            Korn e imágenes para el carrusel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild type="button" variant="outline">
            <Link href="/admin/productos">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Guardando producto...' : 'Guardar Producto'}
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {successSlug ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>Producto creado con éxito. Redirigiendo...</span>
        </div>
      ) : null}

      {/* 1. Información general */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">
        <h2 className="text-base font-bold text-[#111111]">
          1. Información General
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="prod-name" className="text-sm font-medium">
              Nombre comercial del producto *
            </label>
            <Input
              id="prod-name"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej. Perfume Dior Sauvage EDP 100 ml"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="prod-slug" className="text-sm font-medium">
              URL / Slug *
            </label>
            <Input
              id="prod-slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="perfume-dior-sauvage-edp-100ml"
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="prod-category" className="text-sm font-medium">
              Categoría *
            </label>
            <select
              id="prod-category"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#111111] focus:border-[#7B19EC] focus:outline-none focus:ring-2 focus:ring-[#7B19EC]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="prod-brand" className="text-sm font-medium">
              Marca existente
            </label>
            <select
              id="prod-brand"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#111111] focus:border-[#7B19EC] focus:outline-none focus:ring-2 focus:ring-[#7B19EC]"
            >
              <option value="">Sin marca / Crear nueva →</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="prod-new-brand" className="text-sm font-medium">
              O crear nueva marca (opcional)
            </label>
            <Input
              id="prod-new-brand"
              disabled={brandId.length > 0}
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="Ej. Dior, Samsung, Adidas..."
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="prod-short-desc" className="text-sm font-medium">
              Descripción corta
            </label>
            <Input
              id="prod-short-desc"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Resumen breve que aparece debajo del título del producto"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="prod-desc" className="text-sm font-medium">
              Descripción detallada
            </label>
            <textarea
              id="prod-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles, notas olfativas, especificaciones técnicas, materiales..."
              className="w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm text-[#111111] placeholder:text-neutral-400 focus:border-[#7B19EC] focus:outline-none focus:ring-2 focus:ring-[#7B19EC]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 border-t border-neutral-100 pt-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="font-medium">Estado inicial:</span>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value === 'active' ? 'active' : 'draft')
              }
              className="h-9 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm"
            >
              <option value="draft">Borrador (draft)</option>
              <option value="active">Publicado (active)</option>
            </select>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4 accent-[#7B19EC]"
            />
            <span className="font-medium">Destacar en página principal</span>
          </label>
        </div>
      </section>

      {/* 2. Variantes, Precios (ARS) y Stock Propio */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-[#111111]">
              2. Variantes, Precios (ARS) y Stock Inicial
            </h2>
            <p className="text-xs text-neutral-500">
              Para productos simples completá la primera fila. Para colores,
              talles o conectores sumá tantas variantes como necesites.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addVariantRow}
          >
            <Plus className="h-4 w-4" />
            Agregar variante
          </Button>
        </div>

        <div className="space-y-4">
          {variants.map((v, index) => (
            <div
              key={v.key}
              className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <Badge variant={index === 0 ? 'violetSoft' : 'secondary'}>
                  {index === 0
                    ? 'Variante principal'
                    : `Variante #${index + 1}`}
                </Badge>
                {variants.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeVariantRow(v.key)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Quitar
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-600">
                    SKU único *
                  </label>
                  <Input
                    required
                    value={v.sku}
                    onChange={(e) =>
                      updateVariantField(v.key, 'sku', e.target.value)
                    }
                    placeholder="ZYV-PERF-DIOR-100"
                    className="font-mono text-xs uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-600">
                    Título variante *
                  </label>
                  <Input
                    required
                    value={v.title}
                    onChange={(e) =>
                      updateVariantField(v.key, 'title', e.target.value)
                    }
                    placeholder="Ej. 100 ml / Negro / Talle M"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-600">
                    Precio regular (ARS) *
                  </label>
                  <Input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={v.pricePesos}
                    onChange={(e) =>
                      updateVariantField(v.key, 'pricePesos', e.target.value)
                    }
                    placeholder="210000"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-600">
                    Precio promo (ARS, opcional)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={v.promotionalPricePesos}
                    onChange={(e) =>
                      updateVariantField(
                        v.key,
                        'promotionalPricePesos',
                        e.target.value
                      )
                    }
                    placeholder="189000"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-600">
                    Stock inicial (u.) *
                  </label>
                  <Input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={v.initialStock}
                    onChange={(e) =>
                      updateVariantField(v.key, 'initialStock', e.target.value)
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-600">
                    Peso (gramos) *
                  </label>
                  <Input
                    required
                    type="number"
                    min="10"
                    step="1"
                    value={v.weightGrams}
                    onChange={(e) =>
                      updateVariantField(v.key, 'weightGrams', e.target.value)
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-600">
                    Color (opcional)
                  </label>
                  <Input
                    value={v.color}
                    onChange={(e) =>
                      updateVariantField(v.key, 'color', e.target.value)
                    }
                    placeholder="Ej. Negro, Rojo..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-600">
                    Talle (opcional)
                  </label>
                  <Input
                    value={v.size}
                    onChange={(e) =>
                      updateVariantField(v.key, 'size', e.target.value)
                    }
                    placeholder="Ej. S, M, L, XL"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Imágenes del producto (Carrusel multi-imagen optimizado a WebP) */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#111111]">
            3. Imágenes del Producto (Carrusel)
          </h2>
          <p className="text-xs text-neutral-500">
            Podés seleccionar varias fotos (frente, espalda, detalle). Se
            convierten automáticamente a WebP optimizado en el servidor. La
            primera imagen será la portada.
          </p>
        </div>

        <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-6 text-center transition-colors hover:border-[#7B19EC] cursor-pointer">
          <UploadCloud className="h-8 w-8 text-[#7B19EC]" />
          <span className="mt-2 text-sm font-semibold text-[#111111]">
            Hacé clic para seleccionar imágenes (JPG, PNG o WebP)
          </span>
          <span className="mt-1 text-xs text-neutral-500">
            Máximo 10 MB por archivo · Podés elegir múltiples fotos a la vez
          </span>
          <input
            type="file"
            accept="image/webp,image/jpeg,image/png"
            multiple
            onChange={handleFilesChange}
            className="sr-only"
          />
        </label>

        {selectedFiles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, i) => (
              <Badge key={`${file.name}-${i}`} variant="violetSoft">
                {i === 0 ? '★ Portada: ' : `#${i + 1}: `}
                {file.name} ({Math.round(file.size / 1024)} KB)
              </Badge>
            ))}
          </div>
        ) : null}
      </section>

      {/* 4. Restricciones Logísticas */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-bold text-[#111111]">
          4. Restricciones de Transporte y Embalaje
        </h2>
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={containsFlammableLiquid}
              onChange={(e) => setContainsFlammableLiquid(e.target.checked)}
              className="h-4 w-4 accent-[#7B19EC]"
            />
            <span>Contiene líquido inflamable / alcohol (Perfumes)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={containsLithiumBattery}
              onChange={(e) => setContainsLithiumBattery(e.target.checked)}
              className="h-4 w-4 accent-[#7B19EC]"
            />
            <span>Contiene batería de litio (Audio / Electrónica)</span>
          </label>

          {containsLithiumBattery ? (
            <select
              value={lithiumBatteryType}
              onChange={(e) =>
                setLithiumBatteryType(
                  e.target.value === 'standalone_powerbank'
                    ? 'standalone_powerbank'
                    : 'contained_in_equipment'
                )
              }
              className="h-9 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm"
            >
              <option value="contained_in_equipment">
                Batería integrada en equipo
              </option>
              <option value="standalone_powerbank">
                Batería externa / Powerbank
              </option>
            </select>
          ) : null}
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button asChild type="button" variant="outline">
          <Link href="/admin/productos">Cancelar</Link>
        </Button>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? 'Guardando producto...' : 'Guardar Producto'}
        </Button>
      </div>
    </form>
  );
}
