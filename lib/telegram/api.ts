const TELEGRAM_API = 'https://api.telegram.org';

export function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
}

export function isTelegramConfigured() {
  return Boolean(getTelegramBotToken());
}

export function getSiteUrl() {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    '';
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }
  return 'http://localhost:3000';
}

type InlineKeyboardButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

export type InlineKeyboard = InlineKeyboardButton[][];

async function telegramCall<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const token = getTelegramBotToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    ok?: boolean;
    description?: string;
    result?: T;
  };

  if (!res.ok || !data.ok) {
    throw new Error(data.description || `Telegram ${method} failed`);
  }

  return data.result as T;
}

export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: { inline_keyboard: InlineKeyboard },
) {
  return telegramCall('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });
}

export async function sendPhoto(
  chatId: number,
  photo: string,
  caption: string,
  replyMarkup?: { inline_keyboard: InlineKeyboard },
) {
  return telegramCall('sendPhoto', {
    chat_id: chatId,
    photo,
    caption,
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
) {
  return telegramCall('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  });
}

export function mainMenuKeyboard(): InlineKeyboard {
  return [
    [{ text: 'Browse shop', callback_data: 'shop' }],
    [{ text: 'My orders', callback_data: 'orders' }],
  ];
}

export function chunkButtons(
  buttons: InlineKeyboardButton[],
  perRow = 1,
): InlineKeyboard {
  const rows: InlineKeyboard = [];
  for (let i = 0; i < buttons.length; i += perRow) {
    rows.push(buttons.slice(i, i + perRow));
  }
  return rows;
}
