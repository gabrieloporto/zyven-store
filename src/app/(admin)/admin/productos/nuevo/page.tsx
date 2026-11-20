import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NewProductFormClient } from '@/components/admin/NewProductFormClient';

export default async function AdminNewProductPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('brands')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ]);

  return (
    <NewProductFormClient
      categories={categories ?? []}
      brands={brands ?? []}
    />
  );
}
