import { NextResponse } from 'next/server';
import { isTelegramConfigured } from '@/lib/telegram/api';
import {
  handleTelegramUpdate,
  type TelegramUpdate,
} from '@/lib/telegram/handlers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifySecret(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) return true;
  const got = request.headers.get('x-telegram-bot-api-secret-token');
  return got === expected;
}

export async function POST(request: Request) {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN is not configured' },
      { status: 503 },
    );
  }

  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    await handleTelegramUpdate(update);
  } catch (error) {
    console.error('[telegram webhook]', error);
  }

  return NextResponse.json({ ok: true });
}
