'use client';

import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/lib/cart';

export default function CartPage() {
  const { items, itemCount, total, setQuantity, removeItem, clearCart } =
    useCart();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-100 px-6 py-16 text-center dark:border-neutral-600 dark:bg-neutral-900">
        <ShoppingBag className="h-10 w-10 text-neutral-400" />
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            Your cart is empty
          </h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Add digital products from the shop.
          </p>
        </div>
        <Link
          href="/shop"
          className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Browse shop
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Cart
          </h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
        >
          Clear all
        </button>
      </header>

      <ul className="space-y-3">
        {items.map(({ product, quantity }) => (
          <li
            key={product.id}
            className="flex gap-3 rounded-2xl border border-neutral-300 bg-neutral-100 p-4 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-100 to-orange-100 text-[10px] font-bold tracking-wide text-orange-500 uppercase dark:from-neutral-800 dark:to-neutral-700">
              {product.category.slice(0, 6)}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-neutral-900 dark:text-white">
                {product.title}
              </h3>
              <p className="text-sm text-neutral-500">{product.description}</p>
              <p className="mt-1 font-semibold text-neutral-900 dark:text-white">
                ${(product.price * quantity).toFixed(2)}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity(product.id, quantity - 1)}
                  className="rounded-lg border border-neutral-300 p-1.5 dark:border-neutral-600"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-6 text-center text-sm font-medium">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity(product.id, quantity + 1)}
                  className="rounded-lg border border-neutral-300 p-1.5 dark:border-neutral-600"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Remove item"
                  onClick={() => removeItem(product.id)}
                  className="ml-auto rounded-lg p-1.5 text-red-600 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-20 rounded-2xl border border-neutral-300 bg-neutral-100 p-4 md:bottom-4 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <span className="text-neutral-600 dark:text-neutral-400">Total</span>
          <span className="text-xl font-bold text-neutral-900 dark:text-white">
            ${total.toFixed(2)}
          </span>
        </div>
        <Link
          href="/checkout"
          className="mt-3 block w-full rounded-lg bg-orange-500 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
