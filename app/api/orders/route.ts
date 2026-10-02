import { NextResponse } from 'next/server';
import {
  createOrder,
  getOrderByReference,
  getOrdersByEmail,
  isDbConfigured,
  isTxHashUsed,
  toPublicOrder,
} from '@/lib/db';
import { readCatalog } from '@/lib/catalog-store';
import {
  isCryptoAsset,
  isPlausibleTxHash,
  normalizeTxHash,
  toPaystackAmount,
} from '@/lib/payments';
import {
  isPaystackSecretConfigured,
  verifyPaystackTransaction,
} from '@/lib/paystack-server';

export const dynamic = 'force-dynamic';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured. Set DATABASE_URL in .env.local.' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email')?.trim();
  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  try {
    const orders = await getOrdersByEmail(email);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to load orders' },
      { status: 500 },
    );
  }
}

type OrderRequest = {
  email?: string;
  method?: 'crypto' | 'paystack_card' | 'paystack_mobile_money';
  cryptoAsset?: string;
  txHash?: string;
  reference?: string;
  items?: Array<{ productId: string; quantity: number }>;
};

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured. Set DATABASE_URL in .env.local.' },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as OrderRequest;
    const email = body.email?.trim().toLowerCase() || '';

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'items required' }, { status: 400 });
    }

    const catalog = await readCatalog();
    const items = [];
    for (const raw of body.items) {
      const product = catalog.products.find((p) => p.id === String(raw.productId));
      if (!product) {
        return NextResponse.json(
          { error: 'A product in your cart is no longer available' },
          { status: 400 },
        );
      }
      const quantity = Math.min(Math.max(Math.floor(Number(raw.quantity) || 1), 1), 100);
      items.push({
        productId: product.id,
        title: product.title,
        quantity,
        price: product.price,
      });
    }
    const total = Math.round(
      items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100,
    ) / 100;

    if (body.method === 'crypto') {
      const asset = body.cryptoAsset?.trim() || '';
      if (!isCryptoAsset(asset)) {
        return NextResponse.json({ error: 'Choose a crypto asset' }, { status: 400 });
      }
      const txHash = normalizeTxHash(body.txHash || '');
      if (!isPlausibleTxHash(txHash)) {
        return NextResponse.json(
          { error: 'Enter a valid transaction hash from your wallet' },
          { status: 400 },
        );
      }
      if (await isTxHashUsed(txHash)) {
        return NextResponse.json(
          { error: 'This transaction hash was already submitted for another order' },
          { status: 409 },
        );
      }

      const order = await createOrder({
        email,
        total,
        method: `Crypto · ${asset}`,
        status: 'review',
        txHash,
        cryptoAsset: asset,
        items,
      });
      return NextResponse.json({ order: toPublicOrder(order) });
    }

    if (body.method === 'paystack_card' || body.method === 'paystack_mobile_money') {
      const reference = body.reference?.trim() || '';
      if (!reference) {
        return NextResponse.json({ error: 'Payment reference required' }, { status: 400 });
      }
      if (await getOrderByReference(reference)) {
        return NextResponse.json(
          { error: 'This payment was already recorded' },
          { status: 409 },
        );
      }

      let adminNote: string | null = null;
      if (isPaystackSecretConfigured()) {
        const tx = await verifyPaystackTransaction(reference).catch(() => null);
        if (!tx || tx.status !== 'success') {
          return NextResponse.json(
            { error: 'Paystack could not confirm this payment' },
            { status: 402 },
          );
        }
        if (Number(tx.amount ?? 0) + 1 < toPaystackAmount(total)) {
          return NextResponse.json(
            { error: 'Paid amount does not match the order total' },
            { status: 402 },
          );
        }
      } else {
        adminNote =
          'Not verified server-side (PAYSTACK_SECRET_KEY missing). Check the Paystack dashboard before approving.';
      }

      const order = await createOrder({
        email,
        total,
        method:
          body.method === 'paystack_mobile_money'
            ? 'Paystack · Mobile money'
            : 'Paystack · Card',
        status: 'review',
        reference,
        adminNote,
        items,
      });
      return NextResponse.json({ order: toPublicOrder(order) });
    }

    return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 },
    );
  }
}
