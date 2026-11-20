import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatArs } from '@/lib/money';
import { toggleProductPublicationAction } from '@/modules/products/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default async function AdminProductsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: products } = await supabase
    .from('products')
    .select(
      `
      id,
      name,
      slug,
      status,
      has_variants,
      commercial_name_confirmed,
      quality_review_notes,
      contains_flammable_liquid,
      contains_lithium_battery,
      categories(name),
      brands(name),
      product_variants(id, sku, title, price_centavos, inventory_levels(on_hand, reserved, available))
    `
    )
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-zyven-black">
            Gestión de Catálogo y Productos ({products?.length ?? 0})
          </h1>
          <p className="text-sm text-neutral-600">
            Administrá tus productos, agregá nuevos artículos y controlá su
            estado de publicación (<code>draft</code> / <code>active</code>).
          </p>
        </div>

        <Button asChild>
          <Link href="/admin/productos/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo producto
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="py-3.5 pl-5 pr-4">Producto</th>
              <th className="py-3.5 px-4">Categoría / Marca</th>
              <th className="py-3.5 px-4">Variantes / SKU</th>
              <th className="py-3.5 px-4">Precio (ARS)</th>
              <th className="py-3.5 px-4">Stock Disp.</th>
              <th className="py-3.5 px-4">Restricciones</th>
              <th className="py-3.5 px-4">Estado</th>
              <th className="py-3.5 pl-4 pr-5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {(products ?? []).map((p) => {
              const cat = Array.isArray(p.categories)
                ? p.categories[0]
                : p.categories;
              const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands;
              const variants = Array.isArray(p.product_variants)
                ? p.product_variants
                : [];
              const v0 = variants[0];

              const totalAvailable = variants.reduce((acc, v) => {
                const inv = Array.isArray(v.inventory_levels)
                  ? v.inventory_levels[0]
                  : v.inventory_levels;
                return acc + (inv?.available ?? 0);
              }, 0);

              const nextStatus = p.status === 'active' ? 'draft' : 'active';

              return (
                <tr key={p.id}>
                  <td className="py-4 pl-5 pr-4">
                    <div className="font-bold text-[#111111]">{p.name}</div>
                    {variants.length > 1 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {variants.map((v) => (
                          <Badge key={v.id} variant="violetSoft">
                            {v.title}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-4 px-4 text-neutral-600">
                    {cat?.name ?? '—'}{' '}
                    {brand?.name ? `· ${brand.name}` : '· Sin marca'}
                  </td>
                  <td className="py-4 px-4 font-mono text-xs text-neutral-600">
                    {variants.length > 1
                      ? `${variants.length} variantes`
                      : (v0?.sku ?? '—')}
                  </td>
                  <td className="py-4 px-4 font-semibold text-[#111111]">
                    {v0 ? formatArs(v0.price_centavos) : '—'}
                  </td>
                  <td className="py-4 px-4 font-mono font-semibold">
                    {totalAvailable} u.
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-1">
                      {p.contains_flammable_liquid ? (
                        <Badge variant="outline">Inflamable</Badge>
                      ) : null}
                      {p.contains_lithium_battery ? (
                        <Badge variant="outline">Litio</Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      variant={p.status === 'active' ? 'success' : 'secondary'}
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="py-4 pl-4 pr-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {p.status === 'active' ? (
                        <Link
                          href={`/productos/${p.slug}`}
                          className="text-xs font-medium text-[#7B19EC] hover:underline"
                        >
                          Ver
                        </Link>
                      ) : null}
                      <form
                        action={async () => {
                          'use server';
                          await toggleProductPublicationAction({
                            productId: p.id,
                            targetStatus: nextStatus,
                          });
                        }}
                      >
                        <Button
                          type="submit"
                          size="sm"
                          variant={
                            p.status === 'active' ? 'outline' : 'default'
                          }
                        >
                          {p.status === 'active' ? 'Pasar a Draft' : 'Publicar'}
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
