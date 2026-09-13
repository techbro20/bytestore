'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getPaystackCurrency,
  getPaystackPublicKey,
  toPaystackAmount,
} from '@/lib/payments';

type PaystackSuccess = {
  reference: string;
  status?: string;
};

type UsePaystackArgs = {
  email: string;
  amountUsd: number;
  channels?: Array<'card' | 'mobile_money' | 'ussd' | 'bank' | 'qr'>;
  metadata?: Record<string, unknown>;
  onSuccess: (payload: PaystackSuccess) => void;
  onClose?: () => void;
};

declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

function loadPaystackScript() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('No window'));
    if (window.PaystackPop) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-paystack]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Paystack script failed')),
      );
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.dataset.paystack = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Paystack script failed'));
    document.body.appendChild(script);
  });
}

export function usePaystack() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPaystackScript()
      .then(() => setReady(true))
      .catch((e: Error) => setError(e.message));
  }, []);

  const pay = useCallback(
    async ({
      email,
      amountUsd,
      channels = ['card', 'mobile_money'],
      metadata,
      onSuccess,
      onClose,
    }: UsePaystackArgs) => {
      const key = getPaystackPublicKey();
      if (!key) {
        setError('Card and mobile money checkout is temporarily unavailable.');
        return;
      }
      await loadPaystackScript();
      if (!window.PaystackPop) {
        setError('Paystack failed to load.');
        return;
      }

      const handler = window.PaystackPop.setup({
        key,
        email,
        amount: toPaystackAmount(amountUsd),
        currency: getPaystackCurrency(),
        channels,
        metadata,
        ref: `bs_${Date.now()}`,
        callback: (response: PaystackSuccess) => onSuccess(response),
        onClose: () => onClose?.(),
      });
      handler.openIframe();
    },
    [],
  );

  return { ready, error, pay, publicKeyConfigured: Boolean(getPaystackPublicKey()) };
}
