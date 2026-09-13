import {
  createOrder,
  getOrdersByEmail,
  getTelegramSession,
  isDbConfigured,
  setTelegramSession,
  type TelegramSessionData,
} from '@/lib/db';
import { readCatalog, type CatalogProduct } from '@/lib/catalog-store';
import {
  CRYPTO_ASSETS,
  getCryptoAddress,
  type CryptoAsset,
} from '@/lib/payments';
import { initializePaystackTransaction, isPaystackSecretConfigured } from '@/lib/paystack-server';
import {
  answerCallbackQuery,
  chunkButtons,
  ensureBotCommands,
  getSiteUrl,
  mainMenuKeyboard,
  NAV_LABELS,
  navReplyKeyboard,
  sendMessage,
  sendPhoto,
  type InlineKeyboard,
} from '@/lib/telegram/api';

type TelegramUser = {
  id: number;
  first_name?: string;
  username?: string;
};

type TelegramMessage = {
  message_id: number;
  chat: { id: number; type: string };
  text?: string;
  from?: TelegramUser;
};

type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function createReference(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function findProduct(productId: string): Promise<CatalogProduct | null> {
  const catalog = await readCatalog();
  return catalog.products.find((p) => p.id === productId) ?? null;
}

async function showWelcome(chatId: number, name?: string) {
  try {
    await ensureBotCommands();
  } catch {
    // Commands are best-effort; navigation still works via buttons.
  }

  const greeting = name ? `Hi ${escapeHtml(name)}` : 'Welcome';
  await sendMessage(
    chatId,
    [
      `<b>${greeting} — ByteStore</b>`,
      '',
      'Buy digital products here with <b>Paystack</b> (card / MoMo) or <b>crypto</b>.',
      'We deliver to the email you provide.',
      '',
      '<b>Quick start</b>',
      '1. Tap <b>Browse shop</b>',
      '2. Pick a category and product',
      '3. Enter your email and pay',
      '',
      'Use the buttons below anytime — or type /help.',
    ].join('\n'),
    navReplyKeyboard(),
  );
  await sendMessage(chatId, 'What would you like to do?', {
    inline_keyboard: mainMenuKeyboard(),
  });
}

async function showHelp(chatId: number) {
  const site = getSiteUrl();
  await sendMessage(
    chatId,
    [
      '<b>How to buy on ByteStore</b>',
      '',
      '• <b>Browse shop</b> — categories → products → Buy now',
      '• Enter your <b>delivery email</b>',
      '• Pay with <b>Paystack</b> or <b>crypto</b>',
      '• Track purchases with <b>My orders</b>',
      '',
      '<b>Commands</b> (optional)',
      '/start — main menu',
      '/shop — browse products',
      '/orders — your orders',
      '/help — this guide',
      '',
      `Website: ${escapeHtml(site)}`,
    ].join('\n'),
    { inline_keyboard: mainMenuKeyboard() },
  );
}

async function showCategories(chatId: number) {
  const catalog = await readCatalog();
  if (!catalog.categories.length) {
    await sendMessage(chatId, 'No categories yet. Check back soon.', {
      inline_keyboard: mainMenuKeyboard(),
    });
    return;
  }

  const buttons = catalog.categories.map((c) => ({
    text: c.title,
    callback_data: `cat:${c.slug}`.slice(0, 64),
  }));

  await sendMessage(chatId, '<b>Choose a category</b>', {
    inline_keyboard: [
      ...chunkButtons(buttons, 1),
      [{ text: '« Menu', callback_data: 'menu' }],
    ],
  });
}

async function showProducts(chatId: number, categorySlug: string) {
  const catalog = await readCatalog();
  const category = catalog.categories.find((c) => c.slug === categorySlug);
  const products = catalog.products.filter((p) => p.category === categorySlug);

  if (!products.length) {
    await sendMessage(
      chatId,
      `No products in <b>${escapeHtml(category?.title || categorySlug)}</b> yet.`,
      {
        inline_keyboard: [
          [{ text: '« Categories', callback_data: 'shop' }],
          [{ text: '« Menu', callback_data: 'menu' }],
        ],
      },
    );
    return;
  }

  const buttons = products.map((p) => ({
    text: `${p.title} · $${p.price.toFixed(2)}`,
    callback_data: `prod:${p.id}`.slice(0, 64),
  }));

  await sendMessage(
    chatId,
    `<b>${escapeHtml(category?.title || categorySlug)}</b>\nSelect a product:`,
    {
      inline_keyboard: [
        ...chunkButtons(buttons, 1),
        [{ text: '« Categories', callback_data: 'shop' }],
      ],
    },
  );
}

async function showProduct(chatId: number, productId: string) {
  const product = await findProduct(productId);
  if (!product) {
    await sendMessage(chatId, 'Product not found.', {
      inline_keyboard: [[{ text: 'Browse shop', callback_data: 'shop' }]],
    });
    return;
  }

  const caption = [
    `<b>${escapeHtml(product.title)}</b>`,
    `$${product.price.toFixed(2)} USD`,
    '',
    escapeHtml(product.description || product.content || 'Digital product'),
  ].join('\n');

  const keyboard: InlineKeyboard = [
    [{ text: 'Buy now', callback_data: `buy:${product.id}` }],
    [{ text: '« Back', callback_data: `cat:${product.category}`.slice(0, 64) }],
  ];

  if (product.image?.startsWith('http')) {
    try {
      await sendPhoto(chatId, product.image, caption, {
        inline_keyboard: keyboard,
      });
      return;
    } catch {
      // Fall through to text if photo fails
    }
  }

  await sendMessage(chatId, caption, { inline_keyboard: keyboard });
}

async function startCheckout(chatId: number, productId: string) {
  if (!isDbConfigured()) {
    await sendMessage(
      chatId,
      'Orders are temporarily unavailable (database not configured).',
    );
    return;
  }

  const product = await findProduct(productId);
  if (!product) {
    await sendMessage(chatId, 'Product not found.');
    return;
  }

  const session = await getTelegramSession(chatId);
  const next: TelegramSessionData = {
    ...session,
    productId,
    quantity: 1,
    awaiting: session.email ? null : 'email',
  };
  await setTelegramSession(chatId, next);

  if (!session.email) {
    await sendMessage(
      chatId,
      [
        `<b>${escapeHtml(product.title)}</b> — $${product.price.toFixed(2)}`,
        '',
        'Send your <b>delivery email</b> (order details go here).',
      ].join('\n'),
      { inline_keyboard: [[{ text: 'Cancel', callback_data: 'menu' }]] },
    );
    return;
  }

  await showPaymentMethods(chatId, product, session.email);
}

async function showPaymentMethods(
  chatId: number,
  product: CatalogProduct,
  email: string,
) {
  const session = await getTelegramSession(chatId);
  await setTelegramSession(chatId, {
    ...session,
    productId: product.id,
    quantity: session.quantity || 1,
    email,
    awaiting: null,
  });

  const qty = session.quantity || 1;
  const total = product.price * qty;
  const rows: InlineKeyboard = [];

  if (isPaystackSecretConfigured()) {
    rows.push([{ text: 'Pay with Paystack (card / MoMo)', callback_data: 'pay:ps' }]);
  }
  rows.push([{ text: 'Pay with crypto', callback_data: 'pay:cr' }]);
  rows.push([{ text: 'Change email', callback_data: 'email' }]);
  rows.push([{ text: 'Cancel', callback_data: 'menu' }]);

  await sendMessage(
    chatId,
    [
      `<b>Checkout</b>`,
      `${escapeHtml(product.title)} × ${qty}`,
      `Total: <b>$${total.toFixed(2)} USD</b>`,
      `Email: ${escapeHtml(email)}`,
      '',
      isPaystackSecretConfigured()
        ? 'Choose a payment method:'
        : 'Paystack secret key is not set — crypto only for now.',
    ].join('\n'),
    { inline_keyboard: rows },
  );
}

async function startPaystack(chatId: number) {
  const session = await getTelegramSession(chatId);
  if (!session.productId || !session.email) {
    await sendMessage(chatId, 'Start again with /start and pick a product.');
    return;
  }
  if (!isPaystackSecretConfigured()) {
    await sendMessage(chatId, 'Paystack is not configured on the server.');
    return;
  }

  const product = await findProduct(session.productId);
  if (!product) {
    await sendMessage(chatId, 'Product not found.');
    return;
  }

  const qty = session.quantity || 1;
  const total = product.price * qty;
  const reference = createReference('tgps');

  const order = await createOrder({
    email: session.email,
    total,
    method: 'Paystack · Telegram',
    status: 'pending',
    reference,
    items: [
      {
        productId: product.id,
        title: product.title,
        quantity: qty,
        price: product.price,
      },
    ],
  });

  try {
    const payment = await initializePaystackTransaction({
      email: session.email,
      amountUsd: total,
      reference,
      callbackUrl: `${getSiteUrl()}/api/paystack/callback`,
      metadata: {
        order_id: order.id,
        telegram_chat_id: String(chatId),
        source: 'telegram',
      },
    });

    await sendMessage(
      chatId,
      [
        `<b>Paystack payment</b>`,
        `Order <code>${escapeHtml(order.id)}</code>`,
        `Amount: $${total.toFixed(2)} USD`,
        '',
        'Tap below to pay with card or mobile money. After payment you will get a confirmation here.',
      ].join('\n'),
      {
        inline_keyboard: [
          [{ text: 'Open Paystack checkout', url: payment.authorizationUrl }],
          [{ text: '« Menu', callback_data: 'menu' }],
        ],
      },
    );
  } catch (error) {
    await sendMessage(
      chatId,
      error instanceof Error
        ? `Could not start Paystack: ${escapeHtml(error.message)}`
        : 'Could not start Paystack payment.',
    );
  }
}

async function showCryptoAssets(chatId: number) {
  const buttons = CRYPTO_ASSETS.filter((a) => getCryptoAddress(a.id)).map(
    (a) => ({
      text: `${a.label} (${a.network})`,
      callback_data: `ca:${a.id}`,
    }),
  );

  if (!buttons.length) {
    await sendMessage(
      chatId,
      'No crypto addresses are configured. Ask the store admin to set them.',
      { inline_keyboard: [[{ text: '« Back', callback_data: 'menu' }]] },
    );
    return;
  }

  await sendMessage(chatId, '<b>Choose crypto asset</b>', {
    inline_keyboard: [
      ...chunkButtons(buttons, 1),
      [{ text: '« Cancel', callback_data: 'menu' }],
    ],
  });
}

async function showCryptoPay(chatId: number, asset: CryptoAsset) {
  const session = await getTelegramSession(chatId);
  if (!session.productId || !session.email) {
    await sendMessage(chatId, 'Start again with /start and pick a product.');
    return;
  }

  const product = await findProduct(session.productId);
  if (!product) {
    await sendMessage(chatId, 'Product not found.');
    return;
  }

  const address = getCryptoAddress(asset);
  if (!address) {
    await sendMessage(chatId, `${asset} address is not configured.`);
    return;
  }

  const qty = session.quantity || 1;
  const total = product.price * qty;
  await setTelegramSession(chatId, { ...session, cryptoAsset: asset });

  await sendMessage(
    chatId,
    [
      `<b>Crypto payment · ${asset}</b>`,
      `${escapeHtml(product.title)} × ${qty}`,
      `Send <b>$${total.toFixed(2)} USD</b> equivalent in ${asset}`,
      '',
      `<code>${escapeHtml(address)}</code>`,
      '',
      'After you send payment, tap <b>I have paid</b>. We will verify and deliver to your email.',
    ].join('\n'),
    {
      inline_keyboard: [
        [{ text: 'I have paid', callback_data: 'crdone' }],
        [{ text: '« Cancel', callback_data: 'menu' }],
      ],
    },
  );
}

async function confirmCryptoPaid(chatId: number) {
  const session = await getTelegramSession(chatId);
  if (!session.productId || !session.email || !session.cryptoAsset) {
    await sendMessage(chatId, 'No pending crypto checkout. Use /start.');
    return;
  }

  const product = await findProduct(session.productId);
  if (!product) {
    await sendMessage(chatId, 'Product not found.');
    return;
  }

  const qty = session.quantity || 1;
  const total = product.price * qty;
  const asset = session.cryptoAsset;
  const reference = createReference('tgcr');

  const order = await createOrder({
    email: session.email,
    total,
    method: `Crypto · ${asset} · Telegram`,
    status: 'pending',
    reference,
    items: [
      {
        productId: product.id,
        title: product.title,
        quantity: qty,
        price: product.price,
      },
    ],
  });

  await setTelegramSession(chatId, {
    email: session.email,
    awaiting: null,
  });

  await sendMessage(
    chatId,
    [
      `<b>Crypto order recorded</b>`,
      `Order <code>${escapeHtml(order.id)}</code>`,
      `Asset: ${escapeHtml(asset)}`,
      `Total: $${total.toFixed(2)} USD`,
      '',
      `We will verify the transfer and deliver to <b>${escapeHtml(session.email)}</b>.`,
    ].join('\n'),
    { inline_keyboard: mainMenuKeyboard() },
  );
}

async function showOrders(chatId: number) {
  const session = await getTelegramSession(chatId);
  if (!session.email) {
    await setTelegramSession(chatId, { ...session, awaiting: 'email' });
    await sendMessage(
      chatId,
      'Send the email you used at checkout to look up orders.',
      { inline_keyboard: [[{ text: 'Cancel', callback_data: 'menu' }]] },
    );
    return;
  }

  if (!isDbConfigured()) {
    await sendMessage(chatId, 'Orders database is not configured.');
    return;
  }

  const orders = await getOrdersByEmail(session.email);
  if (!orders.length) {
    await sendMessage(
      chatId,
      `No orders for <b>${escapeHtml(session.email)}</b>.`,
      { inline_keyboard: mainMenuKeyboard() },
    );
    return;
  }

  const lines = orders.slice(0, 8).map((o) => {
    const items = o.items.map((i) => i.title).join(', ');
    return `• <code>${escapeHtml(o.id)}</code> — $${o.total.toFixed(2)} — ${escapeHtml(o.status)} — ${escapeHtml(items)}`;
  });

  await sendMessage(
    chatId,
    [`<b>Your orders</b> (${escapeHtml(session.email)})`, '', ...lines].join(
      '\n',
    ),
    { inline_keyboard: mainMenuKeyboard() },
  );
}

async function handleEmailInput(chatId: number, text: string) {
  const email = text.trim().toLowerCase();
  if (!isValidEmail(email)) {
    await sendMessage(chatId, 'That does not look like a valid email. Try again.');
    return;
  }

  const session = await getTelegramSession(chatId);
  const next: TelegramSessionData = {
    ...session,
    email,
    awaiting: null,
  };
  await setTelegramSession(chatId, next);

  if (session.productId) {
    const product = await findProduct(session.productId);
    if (product) {
      await showPaymentMethods(chatId, product, email);
      return;
    }
  }

  await sendMessage(chatId, `Email saved: <b>${escapeHtml(email)}</b>`, {
    inline_keyboard: mainMenuKeyboard(),
  });
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = cq.message?.chat.id ?? cq.from.id;
    const data = cq.data || '';

    try {
      await answerCallbackQuery(cq.id);
    } catch {
      // ignore expired callback answers
    }

    if (data === 'menu' || data === 'start') {
      await showWelcome(chatId, cq.from.first_name);
      return;
    }
    if (data === 'shop') {
      await showCategories(chatId);
      return;
    }
    if (data === 'orders') {
      await showOrders(chatId);
      return;
    }
    if (data === 'help') {
      await showHelp(chatId);
      return;
    }
    if (data === 'email') {
      const session = await getTelegramSession(chatId);
      await setTelegramSession(chatId, { ...session, awaiting: 'email' });
      await sendMessage(chatId, 'Send your delivery email.', {
        inline_keyboard: [[{ text: '« Menu', callback_data: 'menu' }]],
      });
      return;
    }
    if (data.startsWith('cat:')) {
      await showProducts(chatId, data.slice(4));
      return;
    }
    if (data.startsWith('prod:')) {
      await showProduct(chatId, data.slice(5));
      return;
    }
    if (data.startsWith('buy:')) {
      await startCheckout(chatId, data.slice(4));
      return;
    }
    if (data === 'pay:ps') {
      await startPaystack(chatId);
      return;
    }
    if (data === 'pay:cr') {
      await showCryptoAssets(chatId);
      return;
    }
    if (data.startsWith('ca:')) {
      const asset = data.slice(3) as CryptoAsset;
      await showCryptoPay(chatId, asset);
      return;
    }
    if (data === 'crdone') {
      await confirmCryptoPaid(chatId);
      return;
    }

    await sendMessage(chatId, 'Unknown action. Tap Main menu or /start.', {
      inline_keyboard: mainMenuKeyboard(),
    });
    return;
  }

  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();

  if (text === '/start' || text.startsWith('/start ')) {
    await showWelcome(chatId, message.from?.first_name);
    return;
  }
  if (text === '/shop' || text === NAV_LABELS.shop) {
    await showCategories(chatId);
    return;
  }
  if (text === '/orders' || text === NAV_LABELS.orders) {
    await showOrders(chatId);
    return;
  }
  if (text === '/help' || text === NAV_LABELS.help) {
    await showHelp(chatId);
    return;
  }
  if (text === NAV_LABELS.menu) {
    await showWelcome(chatId, message.from?.first_name);
    return;
  }

  const session = await getTelegramSession(chatId);
  if (session.awaiting === 'email') {
    await handleEmailInput(chatId, text);
    return;
  }

  await sendMessage(
    chatId,
    'Tap a button below to continue — or /help if you are new.',
    { inline_keyboard: mainMenuKeyboard() },
  );
}

export async function notifyTelegramChat(chatId: number, text: string) {
  await sendMessage(chatId, text);
}
