import { readCatalog, type CatalogProduct } from '@/lib/catalog-store';
import { getSiteUrl, isTelegramConfigured, sendMessage, sendPhoto } from '@/lib/telegram/api';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function announceProductUpdate(
  product: CatalogProduct,
  kind: 'new' | 'updated',
) {
  const chatIdRaw = process.env.TELEGRAM_ANNOUNCE_CHAT_ID?.trim();
  if (!chatIdRaw || !isTelegramConfigured()) return;

  const chatId = Number(chatIdRaw);
  if (!Number.isFinite(chatId)) return;

  const site = getSiteUrl();
  const botUser = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim();
  const shopLink = botUser
    ? `https://t.me/${botUser.replace(/^@/, '')}`
    : `${site}/shop`;

  const text = [
    kind === 'new' ? '<b>New on ByteStore</b>' : '<b>Product updated</b>',
    `<b>${escapeHtml(product.title)}</b>`,
    `$${product.price.toFixed(2)} USD`,
    '',
    escapeHtml(product.description || '').slice(0, 280),
    '',
    `<a href="${escapeHtml(shopLink)}">Buy on Telegram</a> · <a href="${escapeHtml(`${site}/shop`)}">Open shop</a>`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    if (product.image?.startsWith('http')) {
      await sendPhoto(chatId, product.image, text);
    } else {
      await sendMessage(chatId, text);
    }
  } catch (error) {
    console.error('[telegram announce]', error);
  }
}

export async function getCatalogProduct(id: string) {
  const catalog = await readCatalog();
  return catalog.products.find((p) => p.id === id) ?? null;
}
