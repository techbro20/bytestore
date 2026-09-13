import { NextResponse } from 'next/server';
import {
  createOrder,
  getOrdersByEmail,
  isDbConfigured,
} from '@/lib/db';
import type { OrderStatus } from '@/lib/order-types';

export const dynamic = 'force-dynamic';

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

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured. Set DATABASE_URL in .env.local.' },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      total?: number;
      method?: string;
      status?: OrderStatus;
      reference?: string;
      items?: Array<{
        productId: string;
        title: string;
        quantity: number;
        price: number;
      }>;
    };

    if (!body.email?.trim()) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }
    if (!body.method?.trim()) {
      return NextResponse.json({ error: 'method is required' }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'items required' }, { status: 400 });
    }

    const order = await createOrder({
      email: body.email,
      total: Number(body.total) || 0,
      method: body.method,
      status: body.status || 'pending',
      reference: body.reference,
      items: body.items.map((item) => ({
        productId: String(item.productId),
        title: String(item.title),
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
      })),
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 },
    );
  }
}
