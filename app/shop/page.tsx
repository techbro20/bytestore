import type { Metadata } from 'next';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { getCategoryBySlug } from '@/lib/categories';
import { filterProducts } from '@/lib/products';

export const metadata: Metadata = {
  title: 'Shop',
};

export const dynamic = 'force-dynamic';

type ShopPageProps = {
  searchParams: Promise<{ category?: string; filter?: string }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const category = params.category ?? null;
  const filter = params.filter ?? null;
  const list = await filterProducts({ category, filter });
  const categoryMeta = category ? await getCategoryBySlug(category) : null;

  let heading = 'All Products';
  if (filter === 'bestsellers') heading = 'Bestsellers';
  if (filter === 'new') heading = 'New Arrivals';
  if (categoryMeta) heading = categoryMeta.title;

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h2 className="text-2xl font-medium text-neutral-900 dark:text-white">
          {heading}
        </h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {`${list.length} ${list.length === 1 ? 'product' : 'products'}${
            categoryMeta ? ` in ${categoryMeta.title}` : ''
          }`}
        </p>
      </header>
      <ProductGrid products={list} />
    </div>
  );
}
