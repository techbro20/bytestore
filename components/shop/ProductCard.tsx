'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { Product } from '@/lib/products';
import { useCart } from '@/lib/cart';
import { useToast } from '@/components/ui/Toast';

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { notify } = useToast();
  const router = useRouter();

  const buyNow = () => {
    router.push(`/checkout?buy=${product.slug}`);
  };

  const onAdd = () => {
    addItem(product);
    notify(`${product.title} added to cart`);
  };

  return (
    <article className="flex h-full flex-col rounded-2xl border border-neutral-300/60 bg-white/50 p-4 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-orange-300 hover:shadow-md dark:border-neutral-600/45 dark:bg-neutral-900/40 dark:hover:border-orange-700">
      <div className="mb-3 flex h-28 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-yellow-100/80 to-orange-100/80 dark:from-neutral-800/80 dark:to-neutral-700/80">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-medium tracking-tight text-orange-500 uppercase">
            {product.category.replace('-', ' ').slice(0, 14)}
          </span>
        )}
      </div>
      <div className="mb-1 flex flex-wrap gap-1.5">
        {product.bestseller ? (
          <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-600 dark:text-orange-400">
            Bestseller
          </span>
        ) : null}
        {product.newArrival ? (
          <span className="rounded-full bg-yellow-400/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-yellow-800 dark:text-yellow-300">
            New
          </span>
        ) : null}
      </div>
      <h3 className="text-base font-medium text-neutral-900 dark:text-white">
        {product.title}
      </h3>
      <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
        {product.description}
      </p>
      <div className="mt-auto space-y-2 pt-4">
        <span className="block text-lg font-medium text-neutral-900 dark:text-white">
          ${product.price.toFixed(2)}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-300/70 bg-white/60 px-3 py-2 text-sm font-medium text-neutral-800 transition-colors hover:border-orange-300 dark:border-neutral-600 dark:bg-neutral-800/60 dark:text-white"
          >
            <Plus className="h-4 w-4" />
            Add to cart
          </button>
          <button
            type="button"
            onClick={buyNow}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            Buy now
          </button>
        </div>
      </div>
    </article>
  );
}
