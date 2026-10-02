import type { Metadata } from 'next';
import Link from 'next/link';
import { Headphones } from 'lucide-react';
import { filterProducts, getTools } from '@/lib/catalog';
import { ProductCard } from '@/components/shop/ProductCard';
import { TOOLS_CATEGORY } from '@/lib/tools-category';

export const metadata: Metadata = {
  title: 'Tools',
};

export const dynamic = 'force-dynamic';

export default async function ToolsPage() {
  const [toolProducts, linkTools] = await Promise.all([
    filterProducts({ category: TOOLS_CATEGORY.slug }),
    getTools(),
  ]);

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h2 className="text-2xl font-medium text-neutral-900 dark:text-white">
          Tools
        </h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Software tools and utilities — buy instantly with Paystack or crypto.
        </p>
      </header>

      {toolProducts.length === 0 && linkTools.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300/70 px-6 py-12 text-center text-sm text-neutral-500 dark:border-neutral-600/50">
          No tools yet. Check back soon.
        </p>
      ) : null}

      {toolProducts.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {toolProducts.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      ) : null}

      {linkTools.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {linkTools.map((tool) => (
            <li key={tool.id}>
              <Link
                href={tool.href}
                className="flex h-full flex-col gap-3 rounded-2xl border border-neutral-300/60 bg-white/50 p-5 backdrop-blur-xl transition-colors hover:border-orange-300 dark:border-neutral-600/45 dark:bg-neutral-900/40 dark:hover:border-orange-700"
              >
                {tool.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tool.image}
                    alt=""
                    className="h-28 w-full rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400">
                    <Headphones className="h-5 w-5" />
                  </span>
                )}
                <span>
                  <span className="block text-lg font-medium text-neutral-900 dark:text-white">
                    {tool.title}
                  </span>
                  <span className="mt-1 block text-sm text-neutral-600 dark:text-neutral-400">
                    {tool.body}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
