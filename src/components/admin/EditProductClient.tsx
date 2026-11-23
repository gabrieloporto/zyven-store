'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Power,
  UploadCloud,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Package,
  Image as ImageIcon,
  Layers,
  Settings2,
} from 'lucide-react';
import {
  updateProductDetailsAction,
  saveProductVariantAction,
  toggleVariantStatusAction,
  deleteVariantAction,
  uploadProductImagesBatchAction,
  updateProductImageMetaAction,
  reorderProductImagesAction,
  deleteProductImageAction,
  recordInventoryAdjustmentAction,
} from '@/modules/products/actions';
import { centavosToPesosNumber, formatArs } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export interface EditableProductData {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  brandId: string | null;
  shortDescription: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  isFeatured: boolean;
  containsFlammableLiquid: boolean;
  containsLithiumBattery: boolean;
  lithiumBatteryType:
    | 'none'
    | 'contained_in_equipment'
    | 'standalone_powerbank';
}

export interface EditableVariantData {
  id: string;
  sku: string;
  title: string;
  status: 'draft' | 'active' | 'archived';
  isDefault: boolean;
  priceCentavos: number;
  promotionalPriceCentavos: number | null;
  optionValues: Record<string, string>;
  weightGrams: number;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  hasSales: boolean;
}

export interface EditableImageData {
  id: string;
  variantId: string | null;
  publicUrl: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface StockMovementSummary {
  id: string;
  variantId: string;
  sku: string;
  movementType: string;
  quantityDelta: number;
  onHandBefore: number;
  onHandAfter: number;
  reason: string;
  createdAt: string;
}

interface SelectOption {
  id: string;
  name: string;
  slug: string;
}

interface VariantDraftForm {
  sku: string;
  title: string;
  pricePesos: string;
  promotionalPricePesos: string;
  weightGrams: string;
  status: 'draft' | 'active' | 'archived';
  color: string;
  size: string;
  connector: string;
  extraOptions: Record<string, string>;
}

const MOVEMENT_LABELS: Record<string, string> = {
  purchase_entry: 'Ingreso / Reposición',
  manual_adjustment_in: 'Ajuste (+)',
  manual_adjustment_out: 'Ajuste (-)',
  sale_reservation: 'Reserva venta',
  sale_commit: 'Venta confirmada',
  reservation_release: 'Reserva liberada',
  return_restock: 'Reingreso devolución',
};

function buildVariantFormState(v: EditableVariantData): VariantDraftForm {
  const { Color, Talle, Conector, ...rest } = v.optionValues;
  return {
    sku: v.sku,
    title: v.title,
    pricePesos: String(centavosToPesosNumber(v.priceCentavos)),
    promotionalPricePesos:
      v.promotionalPriceCentavos != null
        ? String(centavosToPesosNumber(v.promotionalPriceCentavos))
        : '',
    weightGrams: String(v.weightGrams),
    status: v.status,
    color: Color ?? '',
    size: Talle ?? '',
    connector: Conector ?? '',
    extraOptions: rest,
  };
}

export function EditProductClient({
  product,
  variants,
  images,
  recentMovements,
  categories,
  brands,
}: {
  product: EditableProductData;
  variants: ReadonlyArray<EditableVariantData>;
  images: ReadonlyArray<EditableImageData>;
  recentMovements: ReadonlyArray<StockMovementSummary>;
  categories: ReadonlyArray<SelectOption>;
  brands: ReadonlyArray<SelectOption>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Feedback global
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // 1. Estado de Datos del Producto
  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [brandId, setBrandId] = useState(product.brandId ?? '');
  const [newBrandName, setNewBrandName] = useState('');
  const [shortDescription, setShortDescription] = useState(
    product.shortDescription
  );
  const [description, setDescription] = useState(product.description);
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>(
    product.status
  );
  const [isFeatured, setIsFeatured] = useState(product.isFeatured);
  const [containsFlammableLiquid, setContainsFlammableLiquid] = useState(
    product.containsFlammableLiquid
  );
  const [containsLithiumBattery, setContainsLithiumBattery] = useState(
    product.containsLithiumBattery
  );
  const [lithiumBatteryType, setLithiumBatteryType] = useState<
    'contained_in_equipment' | 'standalone_powerbank'
  >(
    product.lithiumBatteryType === 'standalone_powerbank'
      ? 'standalone_powerbank'
      : 'contained_in_equipment'
  );

  // 2. Estado de Variantes existentes (mapa por id)
  const [variantForms, setVariantForms] = useState<
    Record<string, VariantDraftForm>
  >(() => {
    const map: Record<string, VariantDraftForm> = {};
    for (const v of variants) {
      map[v.id] = buildVariantFormState(v);
    }
    return map;
  });

  // Formulario para agregar nueva variante
  const [showNewVariantForm, setShowNewVariantForm] = useState(false);
  const [newVarSku, setNewVarSku] = useState('');
  const [newVarTitle, setNewVarTitle] = useState('');
  const [newVarPrice, setNewVarPrice] = useState(
    variants[0] ? String(centavosToPesosNumber(variants[0].priceCentavos)) : ''
  );
  const [newVarPromo, setNewVarPromo] = useState('');
  const [newVarStock, setNewVarStock] = useState('1');
  const [newVarWeight, setNewVarWeight] = useState(
    variants[0] ? String(variants[0].weightGrams) : '300'
  );
  const [newVarColor, setNewVarColor] = useState('');
  const [newVarSize, setNewVarSize] = useState('');
  const [newVarConnector, setNewVarConnector] = useState('');

  // 3. Estado de Imágenes
  const [imageEdits, setImageEdits] = useState<
    Record<string, { variantId: string; altText: string }>
  >(() => {
    const map: Record<string, { variantId: string; altText: string }> = {};
    for (const img of images) {
      map[img.id] = {
        variantId: img.variantId ?? '',
        altText: img.altText,
      };
    }
    return map;
  });
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadVariantId, setUploadVariantId] = useState('');
  const [uploadAltText, setUploadAltText] = useState('');

  // 4. Estado de Ajuste de Stock por Variante
  const [stockAdjustments, setStockAdjustments] = useState<
    Record<
      string,
      {
        movementType:
          | 'purchase_entry'
          | 'manual_adjustment_in'
          | 'manual_adjustment_out';
        quantity: string;
        reason: string;
        lowStockThreshold: string;
      }
    >
  >(() => {
    const map: Record<
      string,
      {
        movementType:
          | 'purchase_entry'
          | 'manual_adjustment_in'
          | 'manual_adjustment_out';
        quantity: string;
        reason: string;
        lowStockThreshold: string;
      }
    > = {};
    for (const v of variants) {
      map[v.id] = {
        movementType: 'purchase_entry',
        quantity: '1',
        reason: '',
        lowStockThreshold: String(v.lowStockThreshold),
      };
    }
    return map;
  });

  function showSuccess(message: string) {
    setFeedback({ type: 'success', message });
  }

  function showError(message: string) {
    setFeedback({ type: 'error', message });
  }

  // --- Handlers Sección 1: Datos generales ---
  function handleSaveGeneral(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await updateProductDetailsAction({
        productId: product.id,
        name,
        slug,
        categoryId,
        brandId: brandId || null,
        newBrandName: brandId ? '' : newBrandName,
        shortDescription,
        description,
        status,
        isFeatured,
        containsFlammableLiquid,
        containsLithiumBattery,
        lithiumBatteryType: containsLithiumBattery
          ? lithiumBatteryType
          : 'none',
      });

      if (!res.ok) {
        showError(res.error.message);
        return;
      }
      setSlug(res.data.slug);
      setNewBrandName('');
      showSuccess('Datos generales del producto actualizados.');
      router.refresh();
    });
  }

  // --- Handlers Sección 2: Variantes ---
  function updateVarForm(
    variantId: string,
    field: keyof VariantDraftForm,
    value: string
  ) {
    setVariantForms((prev) => {
      const current = prev[variantId];
      if (!current) return prev;
      return {
        ...prev,
        [variantId]: {
          ...current,
          [field]: value,
        },
      };
    });
  }

  function handleSaveExistingVariant(variantId: string) {
    const form = variantForms[variantId];
    if (!form) return;
    setFeedback(null);

    const optionValues: Record<string, string> = { ...form.extraOptions };
    if (form.size.trim()) optionValues.Talle = form.size.trim();
    if (form.color.trim()) optionValues.Color = form.color.trim();
    if (form.connector.trim()) optionValues.Conector = form.connector.trim();

    startTransition(async () => {
      const res = await saveProductVariantAction({
        id: variantId,
        productId: product.id,
        sku: form.sku,
        title: form.title,
        pricePesos: Number(form.pricePesos),
        promotionalPricePesos: form.promotionalPricePesos.trim()
          ? Number(form.promotionalPricePesos)
          : null,
        status: form.status,
        weightGrams: Number(form.weightGrams || '250'),
        optionValues,
      });

      if (!res.ok) {
        showError(res.error.message);
        return;
      }
      showSuccess(`Variante "${form.title}" guardada correctamente.`);
      router.refresh();
    });
  }

  function handleCreateVariant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    const optionValues: Record<string, string> = {};
    if (newVarSize.trim()) optionValues.Talle = newVarSize.trim();
    if (newVarColor.trim()) optionValues.Color = newVarColor.trim();
    if (newVarConnector.trim()) optionValues.Conector = newVarConnector.trim();

    const computedTitle =
      newVarTitle.trim() ||
      [
        newVarSize.trim() ? `Talle ${newVarSize.trim()}` : '',
        newVarColor.trim(),
        newVarConnector.trim(),
      ]
        .filter(Boolean)
        .join(' · ') ||
      'Nueva variante';

    startTransition(async () => {
      const res = await saveProductVariantAction({
        productId: product.id,
        sku: newVarSku,
        title: computedTitle,
        pricePesos: Number(newVarPrice),
        promotionalPricePesos: newVarPromo.trim() ? Number(newVarPromo) : null,
        status: product.status === 'active' ? 'active' : 'draft',
        weightGrams: Number(newVarWeight || '250'),
        optionValues,
        initialStock: Number(newVarStock || '0'),
      });

      if (!res.ok) {
        showError(res.error.message);
        return;
      }

      setNewVarSku('');
      setNewVarTitle('');
      setNewVarPromo('');
      setNewVarStock('1');
      setNewVarColor('');
      setNewVarSize('');
      setNewVarConnector('');
      setShowNewVariantForm(false);
      showSuccess(`Nueva variante "${computedTitle}" agregada con éxito.`);
      router.refresh();
    });
  }

  function handleToggleVariantStatus(v: EditableVariantData) {
    setFeedback(null);
    const targetStatus = v.status === 'archived' ? 'active' : 'archived';

    startTransition(async () => {
      const res = await toggleVariantStatusAction({
        productId: product.id,
        variantId: v.id,
        targetStatus,
      });

      if (!res.ok) {
        showError(res.error.message);
        return;
      }

      updateVarForm(v.id, 'status', targetStatus);
      showSuccess(
        targetStatus === 'archived'
          ? `Variante "${v.title}" desactivada.`
          : `Variante "${v.title}" reactivada.`
      );
      router.refresh();
    });
  }

  function handleDeleteVariant(v: EditableVariantData) {
    if (
      !window.confirm(
        `¿Seguro que querés eliminar la variante "${v.title}" (${v.sku})? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await deleteVariantAction({
        productId: product.id,
        variantId: v.id,
      });

      if (!res.ok) {
        showError(res.error.message);
        return;
      }
      showSuccess(`Variante "${v.title}" eliminada.`);
      router.refresh();
    });
  }

  // --- Handlers Sección 3: Imágenes ---
  function handleUploadImages(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      showError('Seleccioná al menos una imagen para subir.');
      return;
    }
    setFeedback(null);

    const formData = new FormData();
    formData.set('productId', product.id);
    if (uploadVariantId) formData.set('variantId', uploadVariantId);
    if (uploadAltText.trim()) formData.set('altText', uploadAltText.trim());
    for (const file of uploadFiles) {
      formData.append('images', file);
    }

    startTransition(async () => {
      const res = await uploadProductImagesBatchAction(formData);
      if (!res.ok) {
        showError(res.error.message);
        return;
      }
      setUploadFiles([]);
      setUploadAltText('');
      setUploadVariantId('');
      showSuccess(
        `${res.data.uploadedCount} imagen(es) optimizada(s) a WebP y agregada(s) al carrusel.`
      );
      router.refresh();
    });
  }

  function handleSaveImageMeta(imageId: string) {
    const edit = imageEdits[imageId];
    if (!edit) return;
    setFeedback(null);

    startTransition(async () => {
      const res = await updateProductImageMetaAction({
        productId: product.id,
        imageId,
        variantId: edit.variantId || null,
        altText: edit.altText,
      });

      if (!res.ok) {
        showError(res.error.message);
        return;
      }
      showSuccess('Vínculo y texto alternativo de la imagen actualizados.');
      router.refresh();
    });
  }

  function handleMoveImage(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    setFeedback(null);

    const ids = images.map((img) => img.id);
    const [moved] = ids.splice(index, 1);
    if (!moved) return;
    ids.splice(targetIndex, 0, moved);

    startTransition(async () => {
      const res = await reorderProductImagesAction({
        productId: product.id,
        orderedImageIds: ids,
      });
      if (!res.ok) {
        showError(res.error.message);
        return;
      }
      showSuccess('Orden del carrusel actualizado.');
      router.refresh();
    });
  }

  function handleDeleteImage(imageId: string) {
    if (!window.confirm('¿Eliminar esta imagen del producto?')) return;
    setFeedback(null);

    startTransition(async () => {
      const res = await deleteProductImageAction({
        productId: product.id,
        imageId,
      });
      if (!res.ok) {
        showError(res.error.message);
        return;
      }
      showSuccess('Imagen eliminada del carrusel.');
      router.refresh();
    });
  }

  // --- Handlers Sección 4: Stock ---
  function updateStockField(
    variantId: string,
    field: 'movementType' | 'quantity' | 'reason' | 'lowStockThreshold',
    value: string
  ) {
    setStockAdjustments((prev) => {
      const curr = prev[variantId] ?? {
        movementType: 'purchase_entry' as const,
        quantity: '1',
        reason: '',
        lowStockThreshold: '2',
      };
      return {
        ...prev,
        [variantId]: {
          ...curr,
          [field]: value,
        },
      };
    });
  }

  function handleApplyStockAdjustment(v: EditableVariantData) {
    const adj = stockAdjustments[v.id];
    if (!adj) return;
    setFeedback(null);

    const qty = Number(adj.quantity);
    const threshold = adj.lowStockThreshold.trim()
      ? Number(adj.lowStockThreshold)
      : undefined;

    startTransition(async () => {
      const res = await recordInventoryAdjustmentAction({
        variantId: v.id,
        movementType: adj.movementType,
        quantity: qty,
        reason: adj.reason.trim(),
        lowStockThreshold: threshold,
        idempotencyKey: `prod-edit:${v.id}:${Date.now()}:${Math.random()
          .toString(36)
          .slice(2, 7)}`,
      });

      if (!res.ok) {
        showError(res.error.message);
        return;
      }

      updateStockField(v.id, 'quantity', '1');
      updateStockField(v.id, 'reason', '');
      showSuccess(
        `Stock de "${v.title}" actualizado: físico ${res.data.newOnHand} u. (disponible ${res.data.available} u.). Movimiento auditado.`
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Encabezado */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/admin/productos"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-[#7B19EC]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al listado de productos
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#111111]">
              Editar Producto
            </h1>
            <Badge
              variant={
                product.status === 'active'
                  ? 'success'
                  : product.status === 'archived'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {product.status}
            </Badge>
            {product.isFeatured ? (
              <Badge variant="violetSoft">Destacado Home</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-neutral-600">{product.name}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {product.status === 'active' ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/productos/${product.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4" />
                Ver en tienda
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/inventario">
              <Package className="h-4 w-4" />
              Ir a Inventario
            </Link>
          </Button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback ? (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`flex items-center gap-2.5 rounded-xl border p-4 text-sm ${
            feedback.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertTriangle className="h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      {/* SECCIÓN 1: Datos del producto y restricciones */}
      <form
        onSubmit={handleSaveGeneral}
        className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-[#7B19EC]" />
            <h2 className="text-base font-bold text-[#111111]">
              1. Datos del Producto y Restricciones de Envío
            </h2>
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            <Save className="h-4 w-4" />
            {isPending ? 'Guardando...' : 'Guardar datos'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="edit-name" className="text-sm font-medium">
              Nombre comercial *
            </label>
            <Input
              id="edit-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-slug" className="text-sm font-medium">
              Slug / URL *
            </label>
            <Input
              id="edit-slug"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-category" className="text-sm font-medium">
              Categoría *
            </label>
            <select
              id="edit-category"
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
            <label htmlFor="edit-brand" className="text-sm font-medium">
              Marca
            </label>
            <select
              id="edit-brand"
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
            <label htmlFor="edit-new-brand" className="text-sm font-medium">
              O crear nueva marca
            </label>
            <Input
              id="edit-new-brand"
              disabled={brandId.length > 0}
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="Ej. Dior, JBL, Nike..."
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="edit-short-desc" className="text-sm font-medium">
              Descripción corta
            </label>
            <Input
              id="edit-short-desc"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="edit-desc" className="text-sm font-medium">
              Descripción detallada
            </label>
            <textarea
              id="edit-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm text-[#111111] focus:border-[#7B19EC] focus:outline-none focus:ring-2 focus:ring-[#7B19EC]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 border-t border-neutral-100 pt-4 text-sm">
          <label className="flex items-center gap-2">
            <span className="font-medium">Estado:</span>
            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value === 'active'
                    ? 'active'
                    : e.target.value === 'archived'
                      ? 'archived'
                      : 'draft'
                )
              }
              className="h-9 rounded-lg border border-neutral-300 bg-white px-2.5 text-sm"
            >
              <option value="draft">Borrador (draft)</option>
              <option value="active">Publicado (active)</option>
              <option value="archived">Archivado (archived)</option>
            </select>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4 accent-[#7B19EC]"
            />
            <span className="font-medium">Destacado en página principal</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-6 border-t border-neutral-100 pt-4 text-sm">
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
            <span>Contiene batería de litio</span>
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
      </form>

      {/* SECCIÓN 2: Precios y Variantes */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#7B19EC]" />
            <div>
              <h2 className="text-base font-bold text-[#111111]">
                2. Precios y Variantes ({variants.length})
              </h2>
              <p className="text-xs text-neutral-500">
                Editá precios (regular y oferta), SKU y opciones (Color, Talle,
                Conector). Las variantes con ventas solo se pueden desactivar.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowNewVariantForm((prev) => !prev)}
          >
            <Plus className="h-4 w-4" />
            {showNewVariantForm ? 'Cancelar nueva' : 'Agregar variante'}
          </Button>
        </div>

        {/* Formulario colapsable para nueva variante */}
        {showNewVariantForm ? (
          <form
            onSubmit={handleCreateVariant}
            className="rounded-xl border-2 border-dashed border-[#7B19EC]/40 bg-[#7B19EC]/5 p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#7B19EC]">
                Nueva variante
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600">
                  SKU único *
                </label>
                <Input
                  required
                  value={newVarSku}
                  onChange={(e) => setNewVarSku(e.target.value)}
                  placeholder="ZYV-PROD-VAR1"
                  className="font-mono text-xs uppercase bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600">
                  Título variante *
                </label>
                <Input
                  required
                  value={newVarTitle}
                  onChange={(e) => setNewVarTitle(e.target.value)}
                  placeholder="Ej. Negro / Talle L / USB-C"
                  className="bg-white"
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
                  value={newVarPrice}
                  onChange={(e) => setNewVarPrice(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600">
                  Precio oferta (ARS, opcional)
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={newVarPromo}
                  onChange={(e) => setNewVarPromo(e.target.value)}
                  placeholder="Menor al regular"
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600">
                  Stock inicial (u.)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={newVarStock}
                  onChange={(e) => setNewVarStock(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600">
                  Peso (gramos)
                </label>
                <Input
                  type="number"
                  min="10"
                  step="1"
                  value={newVarWeight}
                  onChange={(e) => setNewVarWeight(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600">
                  Color
                </label>
                <Input
                  value={newVarColor}
                  onChange={(e) => setNewVarColor(e.target.value)}
                  placeholder="Ej. Negro"
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600">
                  Talle
                </label>
                <Input
                  value={newVarSize}
                  onChange={(e) => setNewVarSize(e.target.value)}
                  placeholder="Ej. S, M, L, XL"
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-600">
                  Conector
                </label>
                <Input
                  value={newVarConnector}
                  onChange={(e) => setNewVarConnector(e.target.value)}
                  placeholder="Ej. USB-C a Lightning"
                  className="bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewVariantForm(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                <Plus className="h-4 w-4" />
                Crear variante
              </Button>
            </div>
          </form>
        ) : null}

        {/* Listado de variantes existentes */}
        <div className="space-y-4">
          {variants.map((v) => {
            const form = variantForms[v.id] ?? buildVariantFormState(v);
            const isArchived = v.status === 'archived';

            return (
              <div
                key={v.id}
                className={`rounded-xl border p-4 space-y-4 ${
                  isArchived
                    ? 'border-neutral-200 bg-neutral-100/70 opacity-80'
                    : 'border-neutral-200 bg-neutral-50/50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        v.status === 'active'
                          ? 'success'
                          : v.status === 'archived'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {v.status}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-[#111111]">
                      {v.sku}
                    </span>
                    <span className="text-xs text-neutral-500">
                      Precio actual: {formatArs(v.priceCentavos)}
                      {v.promotionalPriceCentavos
                        ? ` · Oferta: ${formatArs(v.promotionalPriceCentavos)}`
                        : ''}
                    </span>
                    {v.hasSales ? (
                      <Badge variant="outline">Con ventas registradas</Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleToggleVariantStatus(v)}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {isArchived ? 'Reactivar' : 'Desactivar'}
                    </Button>

                    {!v.hasSales && variants.length > 1 ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleDeleteVariant(v)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                    ) : null}

                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleSaveExistingVariant(v.id)}
                    >
                      <Save className="h-3.5 w-3.5" />
                      Guardar variante
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-600">
                      SKU *
                    </label>
                    <Input
                      value={form.sku}
                      onChange={(e) =>
                        updateVarForm(v.id, 'sku', e.target.value)
                      }
                      className="font-mono text-xs uppercase bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-600">
                      Título *
                    </label>
                    <Input
                      value={form.title}
                      onChange={(e) =>
                        updateVarForm(v.id, 'title', e.target.value)
                      }
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-600">
                      Precio regular (ARS) *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={form.pricePesos}
                      onChange={(e) =>
                        updateVarForm(v.id, 'pricePesos', e.target.value)
                      }
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-600">
                      Precio oferta (ARS, opcional)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={form.promotionalPricePesos}
                      onChange={(e) =>
                        updateVarForm(
                          v.id,
                          'promotionalPricePesos',
                          e.target.value
                        )
                      }
                      placeholder="Vacío = sin oferta"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-600">
                      Peso (gramos)
                    </label>
                    <Input
                      type="number"
                      min="10"
                      step="1"
                      value={form.weightGrams}
                      onChange={(e) =>
                        updateVarForm(v.id, 'weightGrams', e.target.value)
                      }
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-600">
                      Color
                    </label>
                    <Input
                      value={form.color}
                      onChange={(e) =>
                        updateVarForm(v.id, 'color', e.target.value)
                      }
                      placeholder="Ej. Negro, Azul..."
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-600">
                      Talle
                    </label>
                    <Input
                      value={form.size}
                      onChange={(e) =>
                        updateVarForm(v.id, 'size', e.target.value)
                      }
                      placeholder="Ej. S, M, L, XL"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-600">
                      Conector
                    </label>
                    <Input
                      value={form.connector}
                      onChange={(e) =>
                        updateVarForm(v.id, 'connector', e.target.value)
                      }
                      placeholder="Ej. USB-C a USB-C"
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECCIÓN 3: Imágenes y Carrusel */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
          <ImageIcon className="h-5 w-5 text-[#7B19EC]" />
          <div>
            <h2 className="text-base font-bold text-[#111111]">
              3. Imágenes del Carrusel ({images.length})
            </h2>
            <p className="text-xs text-neutral-500">
              La primera foto es la portada. Podés reordenar, vincular cada foto
              a una variante específica, subir fotos nuevas (convertidas
              automáticamente a WebP) o eliminar las viejas.
            </p>
          </div>
        </div>

        {/* Lista de imágenes actuales */}
        {images.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {images.map((img, index) => {
              const edit = imageEdits[img.id] ?? {
                variantId: img.variantId ?? '',
                altText: img.altText,
              };

              return (
                <div
                  key={img.id}
                  className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-3.5 sm:flex-row"
                >
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.publicUrl}
                      alt={img.altText}
                      className="h-full w-full object-contain"
                    />
                    {index === 0 ? (
                      <span className="absolute left-1 top-1 rounded bg-[#7B19EC] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        ★ Portada
                      </span>
                    ) : (
                      <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        #{index + 1}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between gap-2.5">
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-neutral-600">
                          Variante vinculada
                        </label>
                        <select
                          value={edit.variantId}
                          onChange={(e) =>
                            setImageEdits((prev) => ({
                              ...prev,
                              [img.id]: {
                                ...edit,
                                variantId: e.target.value,
                              },
                            }))
                          }
                          className="h-8 w-full rounded-lg border border-neutral-300 bg-white px-2 text-xs text-[#111111]"
                        >
                          <option value="">
                            General (todas las variantes)
                          </option>
                          {variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.title} ({v.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-neutral-600">
                          Texto alternativo (SEO / Vista)
                        </label>
                        <Input
                          value={edit.altText}
                          onChange={(e) =>
                            setImageEdits((prev) => ({
                              ...prev,
                              [img.id]: {
                                ...edit,
                                altText: e.target.value,
                              },
                            }))
                          }
                          className="h-8 bg-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending || index === 0}
                          onClick={() => handleMoveImage(index, -1)}
                          title="Mover hacia arriba / portada"
                          className="h-7 px-2"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending || index === images.length - 1}
                          onClick={() => handleMoveImage(index, 1)}
                          title="Mover hacia abajo"
                          className="h-7 px-2"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleSaveImageMeta(img.id)}
                          className="h-7 px-2.5 text-xs"
                        >
                          <Save className="h-3 w-3" />
                          Guardar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleDeleteImage(img.id)}
                          className="h-7 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="Eliminar imagen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            Este producto todavía no tiene imágenes cargadas.
          </p>
        )}

        {/* Subir nuevas fotos */}
        <form
          onSubmit={handleUploadImages}
          className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-3"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">
            Subir nuevas imágenes (conversión automática a WebP)
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600">
                Vincular fotos nuevas a variante (opcional)
              </label>
              <select
                value={uploadVariantId}
                onChange={(e) => setUploadVariantId(e.target.value)}
                className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-2.5 text-xs text-[#111111]"
              >
                <option value="">General (todas las variantes)</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} ({v.sku})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600">
                Descripción / Vista (opcional)
              </label>
              <Input
                value={uploadAltText}
                onChange={(e) => setUploadAltText(e.target.value)}
                placeholder="Ej. Vista espalda / Color rojo"
                className="h-9 bg-white text-xs"
              />
            </div>
          </div>

          <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-white p-5 text-center transition-colors hover:border-[#7B19EC] cursor-pointer">
            <UploadCloud className="h-7 w-7 text-[#7B19EC]" />
            <span className="mt-1.5 text-sm font-semibold text-[#111111]">
              Seleccionar fotos (JPG, PNG o WebP)
            </span>
            <span className="text-xs text-neutral-500">
              Podés seleccionar múltiples imágenes a la vez
            </span>
            <input
              type="file"
              accept="image/webp,image/jpeg,image/png"
              multiple
              onChange={(e) => setUploadFiles(Array.from(e.target.files ?? []))}
              className="sr-only"
            />
          </label>

          {uploadFiles.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {uploadFiles.map((f, i) => (
                  <Badge key={`${f.name}-${i}`} variant="violetSoft">
                    {f.name} ({Math.round(f.size / 1024)} KB)
                  </Badge>
                ))}
              </div>
              <Button type="submit" size="sm" disabled={isPending}>
                <UploadCloud className="h-4 w-4" />
                {isPending
                  ? 'Optimizando y subiendo...'
                  : `Subir ${uploadFiles.length} foto(s)`}
              </Button>
            </div>
          ) : null}
        </form>
      </section>

      {/* SECCIÓN 4: Stock por Variante con Historial Auditable */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#7B19EC]" />
            <div>
              <h2 className="text-base font-bold text-[#111111]">
                4. Stock por Variante (Depósito Alejandro Korn)
              </h2>
              <p className="text-xs text-neutral-500">
                Cada ajuste genera un movimiento inmutable en{' '}
                <code>inventory_movements</code> respetando{' '}
                <code>on_hand &gt;= reserved</code>.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/inventario">Ver inventario completo</Link>
          </Button>
        </div>

        <div className="space-y-4">
          {variants.map((v) => {
            const adj = stockAdjustments[v.id] ?? {
              movementType: 'purchase_entry' as const,
              quantity: '1',
              reason: '',
              lowStockThreshold: String(v.lowStockThreshold),
            };

            return (
              <div
                key={v.id}
                className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-sm text-[#111111]">
                      {v.title}
                    </span>{' '}
                    <span className="font-mono text-xs text-neutral-500">
                      ({v.sku})
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <Badge variant="secondary">Físico: {v.onHand} u.</Badge>
                    <Badge variant="outline">Reservado: {v.reserved} u.</Badge>
                    <Badge
                      variant={
                        v.available === 0
                          ? 'destructive'
                          : v.available <= v.lowStockThreshold
                            ? 'warning'
                            : 'success'
                      }
                    >
                      Disponible: {v.available} u.
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5 items-end">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-600">
                      Tipo de movimiento
                    </label>
                    <select
                      value={adj.movementType}
                      onChange={(e) =>
                        updateStockField(v.id, 'movementType', e.target.value)
                      }
                      className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-2 text-xs text-[#111111]"
                    >
                      <option value="purchase_entry">
                        + Ingreso / Reposición
                      </option>
                      <option value="manual_adjustment_in">
                        + Ajuste positivo
                      </option>
                      <option value="manual_adjustment_out">
                        - Ajuste negativo
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-600">
                      Cantidad (u.)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={adj.quantity}
                      onChange={(e) =>
                        updateStockField(v.id, 'quantity', e.target.value)
                      }
                      className="h-9 bg-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-600">
                      Alerta stock bajo
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={adj.lowStockThreshold}
                      onChange={(e) =>
                        updateStockField(
                          v.id,
                          'lowStockThreshold',
                          e.target.value
                        )
                      }
                      className="h-9 bg-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-600">
                      Motivo auditoría *
                    </label>
                    <Input
                      value={adj.reason}
                      onChange={(e) =>
                        updateStockField(v.id, 'reason', e.target.value)
                      }
                      placeholder="Ej. Reposición proveedor"
                      className="h-9 bg-white text-xs"
                    />
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending || adj.reason.trim().length < 4}
                    onClick={() => handleApplyStockAdjustment(v)}
                    className="h-9"
                  >
                    Aplicar ajuste
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Historial reciente de movimientos */}
        {recentMovements.length > 0 ? (
          <div className="pt-2">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
              Últimos movimientos registrados
            </h3>
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="py-2 pl-3 pr-2">Fecha</th>
                    <th className="py-2 px-2">SKU</th>
                    <th className="py-2 px-2">Movimiento</th>
                    <th className="py-2 px-2 text-right">Delta</th>
                    <th className="py-2 px-2 text-right">Físico</th>
                    <th className="py-2 pl-2 pr-3">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {recentMovements.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2 pl-3 pr-2 whitespace-nowrap text-neutral-500">
                        {new Date(m.createdAt).toLocaleString('es-AR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-2 px-2 font-mono font-semibold">
                        {m.sku}
                      </td>
                      <td className="py-2 px-2">
                        {MOVEMENT_LABELS[m.movementType] ?? m.movementType}
                      </td>
                      <td
                        className={`py-2 px-2 text-right font-mono font-bold ${
                          m.quantityDelta > 0
                            ? 'text-emerald-700'
                            : 'text-red-600'
                        }`}
                      >
                        {m.quantityDelta > 0
                          ? `+${m.quantityDelta}`
                          : m.quantityDelta}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-neutral-600">
                        {m.onHandBefore} → {m.onHandAfter}
                      </td>
                      <td className="py-2 pl-2 pr-3 text-neutral-600">
                        {m.reason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
