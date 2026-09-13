'use client';

import Link from 'next/link';
import { UserRound } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-md space-y-6 pb-8">
      <header>
        <h2 className="text-2xl font-medium text-neutral-900 dark:text-white">
          Guest profile
        </h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          ByteStore is guest checkout only — no account required.
        </p>
      </header>

      <div className="rounded-2xl border border-neutral-300/60 bg-white/50 p-6 backdrop-blur-xl dark:border-neutral-600/45 dark:bg-neutral-900/40">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400">
            <UserRound className="h-7 w-7" />
          </span>
          <div>
            <p className="font-medium text-neutral-900 dark:text-white">Guest</p>
            <p className="text-sm text-neutral-500">
              Shop, pay, and track orders with just your email
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Link
            href="/orders"
            className="block w-full rounded-lg bg-orange-500 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            View your orders
          </Link>
          <Link
            href="/connect"
            className="block w-full rounded-lg border border-neutral-300/70 py-2.5 text-center text-sm font-medium transition-colors hover:border-orange-300 dark:border-neutral-600"
          >
            Contact support
          </Link>
          <Link
            href="/admin"
            className="block w-full py-2 text-center text-xs text-neutral-500 hover:text-orange-600"
          >
            Admin dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
