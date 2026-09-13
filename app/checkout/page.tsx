import { Suspense } from 'react';
import CheckoutClient from './CheckoutClient';

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-neutral-300 bg-neutral-100 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
          Loading checkout…
        </div>
      }
    >
      <CheckoutClient />
    </Suspense>
  );
}
