'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Bitcoin,
  CheckCircle2,
  Copy,
  CreditCard,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { useCart } from '@/lib/cart';
import type { Product } from '@/lib/products';
import {
  CRYPTO_ASSETS,
  getCryptoAddress,
  type CryptoAsset,
  type PaymentMethod,
} from '@/lib/payments';
import { usePaystack } from '@/hooks/usePaystack';
import { getGuestEmail, setGuestEmail } from '@/lib/guest-orders';

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buySlug = searchParams.get('buy');
  const { items, total, clearCart, ensureItem } = useCart();
  const { pay, error: paystackError, publicKeyConfigured } = usePaystack();

  const [method, setMethod] = useState<PaymentMethod>('paystack_card');
  const [cryptoAsset, setCryptoAsset] = useState<CryptoAsset>('USDC');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [buyReady, setBuyReady] = useState(!buySlug);

  useEffect(() => {
    setEmail(getGuestEmail());
  }, []);

  useEffect(() => {
    if (!buySlug) {
      setBuyReady(true);
      return;
    }
    let cancelled = false;
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((data: { products?: Product[] }) => {
        if (cancelled) return;
        const product = data.products?.find((p) => p.slug === buySlug);
        if (product) ensureItem(product);
        setBuyReady(true);
      })
      .catch(() => setBuyReady(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buySlug]);

  const checkoutTotal = total;
  const address = getCryptoAddress(cryptoAsset);

  const recordOrder = async (payment: {
    method: PaymentMethod;
    reference?: string;
    cryptoAsset?: CryptoAsset;
    txHash?: string;
  }) => {
    setGuestEmail(email.trim());
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        ...payment,
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not save order');
    }
    return data.order as { id: string };
  };

  const onPaystack = async () => {
    if (!email.trim()) {
      setStatus('Enter your email to continue with Paystack.');
      return;
    }
    setStatus(null);
    await pay({
      email: email.trim(),
      amountUsd: checkoutTotal,
      channels:
        method === 'paystack_mobile_money'
          ? ['mobile_money']
          : ['card', 'mobile_money'],
      metadata: {
        cart: items.map((i) => ({
          id: i.product.id,
          qty: i.quantity,
          title: i.product.title,
        })),
      },
      onSuccess: async (res) => {
        try {
          setStatus('Confirming your payment…');
          await recordOrder({ method, reference: res.reference });
          clearCart();
          setStatus(
            `Payment confirmed (ref ${res.reference}). Your order is awaiting review — we will email ${email.trim()} once it is approved.`,
          );
          setTimeout(() => router.push('/orders'), 2500);
        } catch (error) {
          setStatus(
            error instanceof Error
              ? `${error.message}. Contact support with reference ${res.reference}.`
              : `Payment received but the order could not be saved. Contact support with reference ${res.reference}.`,
          );
        }
      },
    });
  };

  const onCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onCryptoConfirm = async () => {
    if (!email.trim()) {
      setStatus('Enter your email so we can deliver after confirmation.');
      return;
    }
    if (!txHash.trim()) {
      setStatus('Paste the transaction hash (TxID) from your wallet.');
      return;
    }
    setSubmitting(true);
    try {
      await recordOrder({
        method: 'crypto',
        cryptoAsset,
        txHash: txHash.trim(),
      });
      clearCart();
      setTxHash('');
      setStatus(
        `Crypto order submitted. We will verify the ${cryptoAsset} transfer and email ${email.trim()} once it is approved.`,
      );
      setTimeout(() => router.push('/orders'), 2500);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Could not save crypto order.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!buyReady) {
    return (
      <div className="rounded-2xl border border-neutral-300/60 bg-white/45 p-8 text-center text-sm text-neutral-500 backdrop-blur-xl dark:border-neutral-600/50 dark:bg-neutral-900/35">
        Preparing checkout…
      </div>
    );
  }

  if (items.length === 0 && !status) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-dashed border-neutral-300/70 bg-white/40 p-8 text-center backdrop-blur-xl dark:border-neutral-600/50 dark:bg-neutral-900/30">
        <h2 className="text-xl font-medium text-neutral-900 dark:text-white">
          Nothing to checkout
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Add products or use Buy now from the shop. No account needed.
        </p>
        <Link
          href="/shop"
          className="inline-flex rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          Browse shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 pb-10 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-4 rounded-2xl border border-neutral-300/60 bg-white/50 p-5 backdrop-blur-xl dark:border-neutral-600/45 dark:bg-neutral-900/40">
        <h2 className="text-2xl font-medium text-neutral-900 dark:text-white">
          Checkout
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Guest checkout — pay and track your order under Orders. No account
          required.
        </p>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-neutral-700 dark:text-neutral-300">
            Email (for delivery)
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full rounded-lg border border-neutral-300 bg-white/80 px-3 py-2.5 text-sm outline-none focus:border-orange-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Payment method
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <MethodButton
              active={method === 'paystack_card'}
              onClick={() => setMethod('paystack_card')}
              icon={CreditCard}
              label="Paystack · Card"
              hint="Visa / Mastercard"
            />
            <MethodButton
              active={method === 'paystack_mobile_money'}
              onClick={() => setMethod('paystack_mobile_money')}
              icon={Smartphone}
              label="Paystack · MoMo"
              hint="Mobile money"
            />
            <MethodButton
              active={method === 'crypto'}
              onClick={() => setMethod('crypto')}
              icon={Bitcoin}
              label="Crypto"
              hint="USDC · ETH · SOL · LTC"
            />
          </div>
        </div>

        {method === 'crypto' ? (
          <div className="space-y-3 rounded-xl border border-neutral-300/70 p-4 dark:border-neutral-700">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Choose asset
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CRYPTO_ASSETS.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setCryptoAsset(asset.id)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    cryptoAsset === asset.id
                      ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400'
                      : 'border-neutral-300 text-neutral-700 dark:border-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  {asset.label}
                </button>
              ))}
            </div>
            <div className="rounded-lg bg-neutral-200/50 p-3 dark:bg-neutral-800/80">
              <p className="text-xs text-neutral-500">Send exactly</p>
              <p className="text-lg font-medium text-neutral-900 dark:text-white">
                ${checkoutTotal.toFixed(2)} USD equivalent in {cryptoAsset}
              </p>
              <p className="mt-2 text-xs text-neutral-500">Deposit address</p>
              {address ? (
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-white px-2 py-1.5 text-xs dark:bg-neutral-950">
                    {address}
                  </code>
                  <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs font-medium dark:border-neutral-600"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-sm text-neutral-500">
                  Deposit address unavailable. Try another asset or contact
                  support.
                </p>
              )}
            </div>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-neutral-700 dark:text-neutral-300">
                Transaction hash (TxID)
              </span>
              <input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder={
                  cryptoAsset === 'SOL' ? 'e.g. 5h3k…' : 'e.g. 0x9f2c…'
                }
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-lg border border-neutral-300 bg-white/80 px-3 py-2.5 font-mono text-xs outline-none focus:border-orange-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
              />
              <span className="mt-1 block text-xs text-neutral-500">
                After sending, copy the transaction ID from your wallet or
                exchange. We verify it before delivering your order.
              </span>
            </label>
            <button
              type="button"
              onClick={onCryptoConfirm}
              disabled={submitting || !txHash.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wallet className="h-4 w-4" />
              {submitting ? 'Submitting…' : `I have paid with ${cryptoAsset}`}
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-neutral-300/70 p-4 dark:border-neutral-700">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {method === 'paystack_mobile_money'
                ? 'Pay securely with mobile money via Paystack.'
                : 'Pay securely with card via Paystack.'}
            </p>
            <button
              type="button"
              onClick={onPaystack}
              disabled={!publicKeyConfigured}
              className="w-full rounded-lg bg-orange-500 py-3 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Pay ${checkoutTotal.toFixed(2)} with Paystack
            </button>
            {!publicKeyConfigured ? (
              <p className="text-center text-xs text-neutral-500">
                Card and mobile money checkout is temporarily unavailable.
              </p>
            ) : null}
          </div>
        )}

        {(status || paystackError) && (
          <p className="flex items-start gap-2 rounded-lg bg-orange-500/10 px-3 py-2 text-sm text-orange-700 dark:text-orange-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {status || paystackError}
          </p>
        )}
      </section>

      <aside className="h-fit space-y-4">
        <div className="rounded-2xl border border-neutral-300/60 bg-white/50 p-5 backdrop-blur-xl dark:border-neutral-600/45 dark:bg-neutral-900/40">
          <h3 className="font-medium text-neutral-900 dark:text-white">
            Order summary
          </h3>
          <ul className="mt-3 space-y-2">
            {items.map(({ product, quantity }) => (
              <li
                key={product.id}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="text-neutral-700 dark:text-neutral-300">
                  {product.title} × {quantity}
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  ${(product.price * quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-neutral-300/60 pt-3 dark:border-neutral-700">
            <span className="text-neutral-600 dark:text-neutral-400">Total</span>
            <span className="text-xl font-medium text-neutral-900 dark:text-white">
              ${checkoutTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function MethodButton({
  active,
  onClick,
  icon: Icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof CreditCard;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-left transition-colors ${
        active
          ? 'border-orange-500 bg-orange-500/10'
          : 'border-neutral-300/70 hover:border-orange-300 dark:border-neutral-600'
      }`}
    >
      <Icon
        className={`mb-1.5 h-4 w-4 ${active ? 'text-orange-500' : 'text-neutral-500'}`}
      />
      <span className="block text-sm font-medium text-neutral-900 dark:text-white">
        {label}
      </span>
      <span className="text-[11px] text-neutral-500">{hint}</span>
    </button>
  );
}
