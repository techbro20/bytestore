import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  countOrdersAwaitingReview,
  getOrderById,
  isDbConfigured,
  listAdminOrders,
  markOrderDelivered,
  markOrderRejected,
  type AdminOrder,
  type AdminOrderFilter,
} from '@/lib/db';
import { isValidAdminToken } from '@/lib/catalog-store';
import { REVIEW_STATUSES } from '@/lib/order-types';
import { notifyTelegramChat } from '@/lib/telegram/handlers';

export const dynamic = 'force-dynamic';

const FILTERS: AdminOrderFilter[] = ['queue', 'delivered', 'rejected', 'all'];
const TELEGRAM_TEXT_LIMIT = 3500;

async function requireAdmin() {
  const jar = await cookies();
  return isValidAdminToken(jar.get('bs_admin')?.value);
}

function requireDb() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );
  }
  return null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function notifyCustomerOnTelegram(order: AdminOrder, text: string) {
  if (!order.telegramChatId || !process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return false;
  }
  try {
    await notifyTelegramChat(order.telegramChatId, text);
    return true;
  } catch (error) {
    console.error('[admin orders] telegram notify', error);
    return false;
  }
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dbError = requireDb();
  if (dbError) return dbError;

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('filter') || 'queue';
  const filter = FILTERS.includes(raw as AdminOrderFilter)
    ? (raw as AdminOrderFilter)
    : 'queue';

  const [orders, awaitingReview] = await Promise.all([
    listAdminOrders(filter),
    countOrdersAwaitingReview(),
  ]);
  return NextResponse.json({ orders, awaitingReview });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dbError = requireDb();
  if (dbError) return dbError;

  const body = (await request.json()) as {
    id?: string;
    action?: 'deliver' | 'reject';
    deliveryDetails?: string;
    reason?: string;
  };

  if (!body.id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  const existing = await getOrderById(body.id);
  if (!existing) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (body.action === 'deliver') {
    const details = body.deliveryDetails?.trim() || '';
    if (!details) {
      return NextResponse.json(
        { error: 'Enter the delivery details you are sending to the customer' },
        { status: 400 },
      );
    }
    if (!REVIEW_STATUSES.includes(existing.status)) {
      return NextResponse.json(
        { error: `Only paid orders awaiting review can be delivered (this one is ${existing.status})` },
        { status: 409 },
      );
    }

    const order = await markOrderDelivered(existing.id, details);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const shown =
      details.length > TELEGRAM_TEXT_LIMIT
        ? `${details.slice(0, TELEGRAM_TEXT_LIMIT)}…\n(Full details sent to your email.)`
        : details;
    const telegramNotified = await notifyCustomerOnTelegram(
      order,
      [
        '<b>Your order has been delivered</b>',
        `Order <code>${escapeHtml(order.id)}</code>`,
        '',
        `<pre>${escapeHtml(shown)}</pre>`,
        '',
        `A copy is also sent to ${escapeHtml(order.email)}. Keep these details private.`,
      ].join('\n'),
    );

    return NextResponse.json({ ok: true, order, telegramNotified });
  }

  if (body.action === 'reject') {
    const reason = body.reason?.trim() || '';
    if (!reason) {
      return NextResponse.json(
        { error: 'Enter a reason so the customer knows what went wrong' },
        { status: 400 },
      );
    }
    if (!REVIEW_STATUSES.includes(existing.status)) {
      return NextResponse.json(
        { error: `Cannot reject an order that is ${existing.status}` },
        { status: 409 },
      );
    }

    const order = await markOrderRejected(existing.id, reason);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const telegramNotified = await notifyCustomerOnTelegram(
      order,
      [
        '<b>Your order was not approved</b>',
        `Order <code>${escapeHtml(order.id)}</code>`,
        '',
        `Reason: ${escapeHtml(reason)}`,
        '',
        'Reply here or contact support if you think this is a mistake.',
      ].join('\n'),
    );

    return NextResponse.json({ ok: true, order, telegramNotified });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
