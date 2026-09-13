'use client';

import { ProductCard } from '@/components/shop/ProductCard';
import { FadeIn } from '@/components/motion/FadeIn';
import type { Product } from '@/lib/products';

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return null;
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, i) => (
        <li key={product.id}>
          <FadeIn delay={i * 0.05}>
            <ProductCard product={product} />
          </FadeIn>
        </li>
      ))}
    </ul>
  );
}
