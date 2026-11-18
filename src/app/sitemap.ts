import type { MetadataRoute } from 'next';
import { getActiveCatalogProducts, getActiveCategoriesList } from '@/modules/products/queries';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const [{ items: products }, categories] = await Promise.all([
    getActiveCatalogProducts({ pageSize: 48 }),
    getActiveCategoriesList(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/productos`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/categoria/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/productos/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.85,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
