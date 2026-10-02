'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Mail, RefreshCw, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import {
  ORDER_STATUS_LABEL,
  REVIEW_STATUSES,
  type AdminOrder,
} from '@/lib/order-types';
import { getExplorerTxUrl } from '@/lib/payments';

type Filter = 'queue' | 'pending' | 'delivered' | 'rejected' | 'all';

const FILTERS: Array<[Filter, string]> = [
  ['queue', 'Awaiting review'],
  ['pending', 'Awaiting payment'],
  ['delivered', 'Delivered'],
  ['rejected', 'Rejected'],
  ['all', 'All'],
];

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-300',
  review: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  paid: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  processing: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  delivered: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  rejected: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

function buildMailto(order: AdminOrder, details: string) {
  const itemLines = order.items
    .map((i) => `- ${i.title} x ${i.quantity}`)
    .join('\n');
  const subject = `Your ByteStore order ${order.id}`;
  const body = [
    'Hi,',
    '',
    'Thank you for your purchase. Here are your order details:',
    '',
    itemLines,
    '',
    details || '[delivery details]',
    '',
    'Please keep these details private.',
    '',
    'ByteStore',
  ].join('\n');
  return `mailto:${order.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function OrdersPanel({
  onCountChange,
}: {
  onCountChange?: (count: number) => void;
}) {
  const { notify } = useToast();
  const [filter, setFilter] = useState<Filter>('queue');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders?filter=${filter}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load orders');
      setOrders(data.orders || []);
      onCountChange?.(Number(data.awaitingReview) || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders');
    } finally {
      setLoading(false);
    }
  }, [filter, onCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (
    order: AdminOrder,
    action: 'deliver' | 'reject',
  ) => {
    setBusyId(order.id);
    setError(null);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          action,
          deliveryDetails: details[order.id],
          reason: reasons[order.id],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      const tg = data.telegramNotified ? ' Customer notified on Telegram.' : '';
      notify(
        action === 'deliver'
          ? `Order ${order.id} marked delivered.${tg}`
          : `Order ${order.id} rejected.${tg}`,
      );
      setRejecting(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    notify(`${label} copied`);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === id
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'border border-neutral-300/70 dark:border-neutral-600'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-neutral-300/70 px-3 py-1.5 text-xs dark:border-neutral-600"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {!loading && orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300/70 px-6 py-12 text-center text-sm text-neutral-500 dark:border-neutral-600/50">
          No orders here.
        </p>
      ) : null}

      <ul className="space-y-3">
        {orders.map((order) => {
          const explorer = getExplorerTxUrl(order.cryptoAsset, order.txHash);
          const canReview =
            REVIEW_STATUSES.includes(order.status) || order.status === 'pending';
          const draft = details[order.id] ?? '';
          return (
            <li
              key={order.id}
              className="space-y-3 rounded-2xl border border-neutral-300/60 bg-white/50 p-4 backdrop-blur-xl dark:border-neutral-600/50 dark:bg-neutral-900/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-white">
                    {order.email}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {order.id} · {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[order.status] ?? ''}`}
                >
                  {ORDER_STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>

              <ul className="space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                {order.items.map((item, i) => (
                  <li key={`${order.id}-${i}`} className="flex justify-between gap-3">
                    <span>
                      {item.title} × {item.quantity}
                    </span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              <div className="grid gap-1 border-t border-neutral-300/50 pt-3 text-xs text-neutral-600 dark:border-neutral-700/50 dark:text-neutral-400 sm:grid-cols-2">
                <p>
                  <span className="text-neutral-500">Method:</span> {order.method}
                </p>
                <p className="text-right font-medium text-neutral-900 dark:text-white sm:text-sm">
                  ${order.total.toFixed(2)}
                </p>
                {order.reference ? (
                  <p className="truncate sm:col-span-2">
                    <span className="text-neutral-500">Reference:</span>{' '}
                    <code>{order.reference}</code>
                  </p>
                ) : null}
                {order.txHash ? (
                  <p className="flex min-w-0 items-center gap-2 sm:col-span-2">
                    <span className="shrink-0 text-neutral-500">TxID:</span>
                    <code className="truncate">{order.txHash}</code>
                    <button
                      type="button"
                      onClick={() => void copy(order.txHash!, 'Transaction hash')}
                      className="shrink-0 text-orange-600"
                      aria-label="Copy transaction hash"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {explorer ? (
                      <a
                        href={explorer}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-orange-600 hover:underline"
                      >
                        Verify <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </p>
                ) : null}
                {order.telegramChatId ? (
                  <p className="sm:col-span-2">
                    <span className="text-neutral-500">Telegram:</span> customer
                    will be notified in the bot
                  </p>
                ) : null}
                {order.adminNote ? (
                  <p className="text-amber-700 dark:text-amber-400 sm:col-span-2">
                    Note: {order.adminNote}
                  </p>
                ) : null}
              </div>

              {order.status === 'delivered' ? (
                <div className="space-y-2 rounded-xl bg-emerald-500/5 p-3">
                  <p className="text-xs text-neutral-500">
                    Delivered{' '}
                    {order.deliveredAt
                      ? new Date(order.deliveredAt).toLocaleString()
                      : ''}{' '}
                    · admin-only record
                  </p>
                  <pre className="whitespace-pre-wrap break-words text-xs text-neutral-800 dark:text-neutral-200">
                    {order.deliveryDetails}
                  </pre>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={buildMailto(order, order.deliveryDetails || '')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs dark:border-neutral-600"
                    >
                      <Mail className="h-3.5 w-3.5" /> Email again
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        void copy(order.deliveryDetails || '', 'Delivery details')
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs dark:border-neutral-600"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy details
                    </button>
                  </div>
                </div>
              ) : null}

              {canReview ? (
                <div className="space-y-2">
                  <textarea
                    value={draft}
                    onChange={(e) =>
                      setDetails((d) => ({ ...d, [order.id]: e.target.value }))
                    }
                    rows={4}
                    placeholder="Delivery details to send (credentials, license key, download link…)"
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs dark:border-neutral-600 dark:bg-neutral-800"
                  />
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={buildMailto(order, draft)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium dark:border-neutral-600"
                    >
                      <Mail className="h-3.5 w-3.5" /> Open email to customer
                    </a>
                    <button
                      type="button"
                      onClick={() => void copy(order.email, 'Email address')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-xs dark:border-neutral-600"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy email
                    </button>
                    <button
                      type="button"
                      disabled={busyId === order.id || !draft.trim()}
                      onClick={() => {
                        if (
                          confirm(
                            `Mark ${order.id} as delivered? Make sure you have emailed ${order.email}.`,
                          )
                        ) {
                          void act(order, 'deliver');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve &amp; mark delivered
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRejecting((r) => (r === order.id ? null : order.id))
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-600 dark:border-red-800"
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                  {rejecting === order.id ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={reasons[order.id] ?? ''}
                        onChange={(e) =>
                          setReasons((r) => ({ ...r, [order.id]: e.target.value }))
                        }
                        placeholder="Reason shown to the customer (e.g. transaction not found)"
                        className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs dark:border-neutral-600 dark:bg-neutral-800"
                      />
                      <button
                        type="button"
                        disabled={busyId === order.id || !reasons[order.id]?.trim()}
                        onClick={() => void act(order, 'reject')}
                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                      >
                        Confirm reject
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
