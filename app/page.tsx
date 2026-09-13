'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { FadeIn } from '@/components/motion/FadeIn';
import { TechHeroBackground } from '@/components/motion/TechHeroBackground';
import { ByteStoreLogo } from '@/components/brand/ByteStoreLogo';
import type { Product } from '@/lib/products';
import type { CatalogCategory } from '@/lib/catalog-store';

const statusSteps = [
  'Order placed',
  'Payment confirmed',
  'Product delivered',
];

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then(
        (data: { products?: Product[]; categories?: CatalogCategory[] }) => {
          const products = data.products || [];
          setFeatured(
            products.filter((p) => p.bestseller).slice(0, 3).length
              ? products.filter((p) => p.bestseller).slice(0, 3)
              : products.slice(0, 3),
          );
          setCategories((data.categories || []).slice(0, 6));
        },
      )
      .catch(() => {
        setFeatured([]);
        setCategories([]);
      });
  }, []);

  return (
    <div className="space-y-10 pb-8">
      <section className="relative isolate min-h-[22rem] overflow-hidden rounded-2xl border border-neutral-800 sm:min-h-[26rem]">
        <TechHeroBackground />
        <div className="relative z-10 grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:p-10">
          <FadeIn>
            <div className="mb-4 w-36 sm:w-44">
              <ByteStoreLogo variant="full" priority className="drop-shadow-lg" />
            </div>
            <h2 className="mt-2 max-w-xl text-3xl font-medium tracking-tight text-white sm:text-4xl lg:text-5xl">
              Digital products. Secure checkout. Email delivery.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-neutral-300 sm:text-base">
              Browse the shop, pay as a guest, and track your order — no account
              required.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
              >
                Shop now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/orders"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-black/55"
              >
                View orders
              </Link>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut', delay: 0.2 }}
              className="rounded-2xl border border-white/10 bg-neutral-950/80 p-5 shadow-xl backdrop-blur-md"
            >
              <p className="text-xs font-medium tracking-wider text-orange-400 uppercase">
                Order status
              </p>
              <ul className="mt-4 space-y-3">
                {statusSteps.map((step, i) => (
                  <li key={step} className="flex items-center gap-3 text-sm">
                    <CheckCircle2
                      className={`h-5 w-5 ${
                        i < 2 ? 'text-orange-500' : 'text-neutral-500'
                      }`}
                    />
                    <span className={i < 2 ? 'text-white' : 'text-neutral-400'}>
                      {step}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </FadeIn>
        </div>
      </section>

      {categories.length > 0 ? (
        <FadeIn>
          <section className="grid grid-cols-1 gap-3 rounded-2xl border border-neutral-300/60 bg-white/50 p-4 backdrop-blur-xl sm:grid-cols-3 dark:border-neutral-600/45 dark:bg-neutral-900/40">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/shop?category=${category.slug}`}
                className="flex items-center gap-3 rounded-xl bg-white/40 p-4 transition-colors hover:bg-orange-500/10 dark:bg-white/5 dark:hover:bg-orange-500/10"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400">
                  <LayoutGrid className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-medium text-neutral-900 dark:text-white">
                    {category.title}
                  </span>
                  <span className="line-clamp-1 text-sm text-neutral-500">
                    {category.description || 'Browse products'}
                  </span>
                </span>
              </Link>
            ))}
          </section>
        </FadeIn>
      ) : null}

      <section className="rounded-2xl border border-neutral-300/60 bg-white/50 p-4 backdrop-blur-xl sm:p-6 dark:border-neutral-600/45 dark:bg-neutral-900/40">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h3 className="text-xl font-medium text-neutral-900 dark:text-white">
            Featured
          </h3>
          <Link
            href="/shop"
            className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
          >
            View all
          </Link>
        </div>
        {featured.length > 0 ? <ProductGrid products={featured} /> : null}
      </section>
    </div>
  );
}
