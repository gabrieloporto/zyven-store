import Link from 'next/link';
import {
  getActiveCatalogProducts,
  getActiveCategoriesList,
  getActiveBrandsList,
} from '@/modules/products/queries';
import { ProductCard } from '@/components/storefront/ProductCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CatalogPageProps {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    marca?: string;
    orden?: 'featured' | 'price_asc' | 'price_desc' | 'newest';
    stock?: string;
    pagina?: string;
  }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const page = Number(params.pagina ?? '1') || 1;

  const [catalog, categories, brands] = await Promise.all([
    getActiveCatalogProducts({
      q: params.q,
      categorySlug: params.categoria,
      brandSlug: params.marca,
      inStockOnly: params.stock === '1',
      sortBy: params.orden ?? 'featured',
      page,
      pageSize: 12,
    }),
    getActiveCategoriesList(),
    getActiveBrandsList(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end">
        <div>
          <Badge variant="violetSoft" className="mb-2">
            Catálogo Oficial
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
            {params.q
              ? `Resultados para "${params.q}"`
              : 'Todos nuestros productos'}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            {catalog.totalCount} productos publicados disponibles
          </p>
        </div>

        {/* Buscador y ordenamiento */}
        <form
          action="/productos"
          method="GET"
          className="flex flex-wrap items-center gap-2.5"
        >
          {params.categoria ? (
            <input type="hidden" name="categoria" value={params.categoria} />
          ) : null}
          {params.marca ? (
            <input type="hidden" name="marca" value={params.marca} />
          ) : null}

          <Input
            type="search"
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Buscar por nombre, marca..."
            className="w-56 sm:w-64"
          />

          <select
            name="orden"
            defaultValue={params.orden ?? 'featured'}
            aria-label="Ordenar productos"
            className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-[#111111] focus:border-[#7B19EC] focus:outline-none focus:ring-2 focus:ring-[#7B19EC]"
          >
            <option value="featured">Destacados</option>
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
            <option value="newest">Más recientes</option>
          </select>

          <Button type="submit">Aplicar</Button>
        </form>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Filtros laterales */}
        <aside className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
              Categorías
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/productos"
                  className={
                    !params.categoria
                      ? 'font-bold text-[#7B19EC]'
                      : 'text-neutral-600 hover:text-[#111111]'
                  }
                >
                  Todas las categorías
                </Link>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/productos?categoria=${cat.slug}`}
                    className={
                      params.categoria === cat.slug
                        ? 'font-bold text-[#7B19EC]'
                        : 'text-neutral-600 hover:text-[#111111]'
                    }
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">
              Marcas
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href={
                    params.categoria
                      ? `/productos?categoria=${params.categoria}`
                      : '/productos'
                  }
                  className={
                    !params.marca
                      ? 'font-bold text-[#7B19EC]'
                      : 'text-neutral-600 hover:text-[#111111]'
                  }
                >
                  Todas las marcas
                </Link>
              </li>
              {brands.map((brand) => (
                <li key={brand.id}>
                  <Link
                    href={`/productos?${
                      params.categoria ? `categoria=${params.categoria}&` : ''
                    }marca=${brand.slug}`}
                    className={
                      params.marca === brand.slug
                        ? 'font-bold text-[#7B19EC]'
                        : 'text-neutral-600 hover:text-[#111111]'
                    }
                  >
                    {brand.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Grilla de productos */}
        <div className="lg:col-span-3">
          {catalog.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 p-12 text-center">
              <h3 className="text-lg font-bold text-[#111111]">
                No hay productos publicados con estos filtros
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
                Los productos del catálogo inicial se encuentran en estado
                borrador hasta ser revisados y publicados desde el Panel de
                Administración.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button asChild variant="outline">
                  <Link href="/productos">Limpiar filtros</Link>
                </Button>
                <Button asChild>
                  <Link href="/admin/productos">Ir a Administración</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {catalog.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
