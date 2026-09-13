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

export type ReplyKeyboard = { text: string }[][];

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
  replyMarkup?:
    | { inline_keyboard: InlineKeyboard }
    | {
        keyboard: ReplyKeyboard;
        resize_keyboard?: boolean;
        is_persistent?: boolean;
      },
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

/** Registers the / menu commands shown in Telegram clients. */
export async function ensureBotCommands() {
  return telegramCall('setMyCommands', {
    commands: [
      { command: 'start', description: 'Open main menu' },
      { command: 'shop', description: 'Browse products' },
      { command: 'orders', description: 'View your orders' },
      { command: 'help', description: 'How to buy' },
    ],
  });
}

export function mainMenuKeyboard(): InlineKeyboard {
  return [
    [{ text: 'Browse shop', callback_data: 'shop' }],
    [
      { text: 'My orders', callback_data: 'orders' },
      { text: 'How to buy', callback_data: 'help' },
    ],
  ];
}

/** Persistent bottom keyboard so users can navigate without typing commands. */
export function navReplyKeyboard(): {
  keyboard: ReplyKeyboard;
  resize_keyboard: boolean;
  is_persistent: boolean;
} {
  return {
    keyboard: [
      [{ text: 'Browse shop' }, { text: 'My orders' }],
      [{ text: 'How to buy' }, { text: 'Main menu' }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

export const NAV_LABELS = {
  shop: 'Browse shop',
  orders: 'My orders',
  help: 'How to buy',
  menu: 'Main menu',
} as const;

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
