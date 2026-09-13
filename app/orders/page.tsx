'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PackageOpen } from 'lucide-react';
import { getGuestEmail, setGuestEmail } from '@/lib/guest-orders';
import type { DbOrder, OrderStatus } from '@/lib/order-types';

const statusLabel: Record<OrderStatus, string> = {
  pending: 'Pending confirmation',
  paid: 'Paid',
  processing: 'Processing delivery',
  delivered: 'Delivered',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async (lookupEmail: string) => {
    if (!lookupEmail.trim()) {
      setOrders([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/orders?email=${encodeURIComponent(lookupEmail.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setOrders([]);
        setError(data.error || 'Could not load orders');
        return;
      }
      setOrders(data.orders || []);
      setGuestEmail(lookupEmail.trim());
    } catch {
      setOrders([]);
      setError('Could not load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = getGuestEmail();
    setEmail(saved);
    if (saved) void loadOrders(saved);
  }, [loadOrders]);

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h2 className="text-2xl font-medium text-neutral-900 dark:text-white">
          Orders
        </h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Enter the email you used at checkout to view your orders.
        </p>
      </header>

      <form
        className="flex max-w-md flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void loadOrders(email);
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          required
          className="w-full rounded-lg border border-neutral-300/70 bg-white/50 px-3 py-2.5 text-sm backdrop-blur dark:border-neutral-600 dark:bg-neutral-900/40"
        />
        <button
          type="submit"
          className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          Look up
        </button>
      </form>

      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading orders…</p>
      ) : !email.trim() ? (
        <div className="rounded-2xl border border-dashed border-neutral-300/70 bg-white/40 px-6 py-12 text-center backdrop-blur-xl dark:border-neutral-600/50 dark:bg-neutral-900/30">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Enter your checkout email to find orders tied only to you.
          </p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-300/70 bg-white/40 px-6 py-16 text-center backdrop-blur-xl dark:border-neutral-600/50 dark:bg-neutral-900/30">
          <PackageOpen className="h-10 w-10 text-neutral-400" />
          <div>
            <p className="text-lg font-medium text-neutral-900 dark:text-white">
              No orders for this email
            </p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              After checkout, purchases for this email appear here.
            </p>
          </div>
          <Link
            href="/shop"
            className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
          >
            Browse shop
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-2xl border border-neutral-300/60 bg-white/50 p-4 backdrop-blur-xl dark:border-neutral-600/45 dark:bg-neutral-900/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {order.id}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(order.createdAt).toLocaleString()} · {order.email}
                  </p>
                </div>
                <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                  {statusLabel[order.status]}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                {order.items.map((item, i) => (
                  <li
                    key={`${order.id}-${i}`}
                    className="flex justify-between gap-3"
                  >
                    <span>
                      {item.title} × {item.quantity}
                    </span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-300/50 pt-3 text-sm dark:border-neutral-700/50">
                <span className="text-neutral-500">
                  {order.method}
                  {order.reference ? ` · ${order.reference}` : ''}
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  ${order.total.toFixed(2)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
