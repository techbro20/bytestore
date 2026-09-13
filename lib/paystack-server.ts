import {
  getPaystackCurrency,
  toPaystackAmount,
} from '@/lib/payments';

export function getPaystackSecretKey() {
  return process.env.PAYSTACK_SECRET_KEY?.trim() || '';
}

export function isPaystackSecretConfigured() {
  return Boolean(getPaystackSecretKey());
}

type InitializeInput = {
  email: string;
  amountUsd: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

export async function initializePaystackTransaction(input: InitializeInput) {
  const secret = getPaystackSecretKey();
  if (!secret) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      amount: toPaystackAmount(input.amountUsd),
      currency: getPaystackCurrency().toUpperCase(),
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ['card', 'mobile_money'],
      metadata: input.metadata ?? {},
    }),
  });

  const data = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; access_code?: string; reference?: string };
  };

  if (!res.ok || !data.status || !data.data?.authorization_url) {
    throw new Error(data.message || 'Could not initialize Paystack payment');
  }

  return {
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code || '',
    reference: data.data.reference || input.reference,
  };
}

export async function verifyPaystackTransaction(reference: string) {
  const secret = getPaystackSecretKey();
  if (!secret) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    },
  );

  const data = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: {
      status?: string;
      reference?: string;
      amount?: number;
      currency?: string;
      customer?: { email?: string };
      metadata?: Record<string, unknown>;
    };
  };

  if (!res.ok || !data.status || !data.data) {
    throw new Error(data.message || 'Could not verify Paystack payment');
  }

  return data.data;
}
