import { NextResponse } from 'next/server';
import {
  getOrderByReference,
  updateOrderStatus,
} from '@/lib/db';
import { toPaystackAmount } from '@/lib/payments';
import { verifyPaystackTransaction } from '@/lib/paystack-server';
import { notifyTelegramChat } from '@/lib/telegram/handlers';

export const dynamic = 'force-dynamic';

function htmlPage(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.5; color: #171717; }
    h1 { font-size: 1.35rem; }
    a { color: #ea580c; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${body}</p>
  <p><a href="/orders">View orders on the website</a></p>
</body>
</html>`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference')?.trim();

  if (!reference) {
    return new NextResponse(
      htmlPage('Payment', 'Missing payment reference.'),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  try {
    const tx = await verifyPaystackTransaction(reference);
    if (tx.status !== 'success') {
      return new NextResponse(
        htmlPage(
          'Payment pending',
          `Paystack status: ${tx.status || 'unknown'}. If you paid, wait a moment and check Telegram or /orders.`,
        ),
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      );
    }

    const order = await getOrderByReference(reference);
    if (order && Number(tx.amount ?? 0) + 1 < toPaystackAmount(order.total)) {
      return new NextResponse(
        htmlPage(
          'Amount mismatch',
          `The amount paid does not match order ${order.id}. Please contact support with reference ${reference}.`,
        ),
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      );
    }
    const firstConfirmation = order?.status === 'pending';
    if (order && firstConfirmation) {
      await updateOrderStatus(order.id, 'review');
    }

    const meta = tx.metadata || {};
    const chatRaw = meta.telegram_chat_id;
    const chatId =
      typeof chatRaw === 'string' || typeof chatRaw === 'number'
        ? Number(chatRaw)
        : NaN;

    if (firstConfirmation && Number.isFinite(chatId) && chatId > 0) {
      try {
        await notifyTelegramChat(
          chatId,
          [
            '<b>Payment confirmed</b>',
            order
              ? `Order <code>${order.id}</code> is now awaiting review.`
              : `Reference <code>${reference}</code> verified.`,
            'You will get a message here once your order is approved and sent.',
          ].join('\n'),
        );
      } catch (error) {
        console.error('[paystack callback] telegram notify', error);
      }
    }

    return new NextResponse(
      htmlPage(
        'Payment successful',
        order
          ? `Thanks! Order ${order.id} is paid and awaiting review. You can close this tab and return to Telegram.`
          : 'Thanks! Payment verified. You can close this tab and return to Telegram.',
      ),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  } catch (error) {
    console.error('[paystack callback]', error);
    return new NextResponse(
      htmlPage(
        'Verification failed',
        error instanceof Error
          ? error.message
          : 'Could not verify this payment.',
      ),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
}
