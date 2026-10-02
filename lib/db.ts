import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import {
  REVIEW_STATUSES,
  type AdminOrder,
  type DbOrder,
  type DbOrderItem,
  type OrderStatus,
} from './order-types';

export type {
  AdminOrder,
  DbOrder,
  DbOrderItem,
  OrderStatus,
} from './order-types';

let sql: NeonQueryFunction<false, false> | null = null;
let schemaReady: Promise<void> | null = null;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Add your Neon connection string to .env.local.');
  }
  if (!sql) {
    sql = neon(url);
  }
  return sql;
}

export function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function ensureOrderSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb();
      await db`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          total NUMERIC(12, 2) NOT NULL,
          method TEXT NOT NULL,
          status TEXT NOT NULL,
          reference TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS order_items (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          product_id TEXT NOT NULL,
          title TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          price NUMERIC(12, 2) NOT NULL
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (email)`;
      await db`CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC)`;
      await db`CREATE INDEX IF NOT EXISTS orders_reference_idx ON orders (reference)`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tx_hash TEXT`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS crypto_asset TEXT`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_details TEXT`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_note TEXT`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ`;
      await db`CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status)`;
      await db`CREATE INDEX IF NOT EXISTS orders_tx_hash_idx ON orders (tx_hash)`;
      await db`
        CREATE TABLE IF NOT EXISTS telegram_sessions (
          chat_id BIGINT PRIMARY KEY,
          data TEXT NOT NULL DEFAULT '{}',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS categories (
          slug TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT ''
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          slug TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL REFERENCES categories(slug) ON DELETE CASCADE,
          price NUMERIC(12, 2) NOT NULL DEFAULT 0,
          bestseller BOOLEAN NOT NULL DEFAULT false,
          new_arrival BOOLEAN NOT NULL DEFAULT false,
          content TEXT NOT NULL DEFAULT '',
          image TEXT NOT NULL DEFAULT ''
        )
      `;
      await db`
        CREATE TABLE IF NOT EXISTS tools (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          body TEXT NOT NULL DEFAULT '',
          href TEXT NOT NULL DEFAULT '/shop',
          image TEXT NOT NULL DEFAULT ''
        )
      `;
      await db`CREATE INDEX IF NOT EXISTS products_category_idx ON products (category)`;
    })();
  }
  await schemaReady;
}

/** @deprecated Use ensureOrderSchema — same initializer. */
export const ensureSchema = ensureOrderSchema;

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function createOrder(input: {
  email: string;
  total: number;
  method: string;
  status: OrderStatus;
  reference?: string;
  txHash?: string | null;
  cryptoAsset?: string | null;
  adminNote?: string | null;
  telegramChatId?: number | null;
  items: DbOrderItem[];
}): Promise<DbOrder> {
  await ensureOrderSchema();
  const db = getDb();
  const id = createId('ord');
  const email = input.email.trim().toLowerCase();

  await db`
    INSERT INTO orders (
      id, email, total, method, status, reference,
      tx_hash, crypto_asset, admin_note, telegram_chat_id
    )
    VALUES (
      ${id},
      ${email},
      ${input.total},
      ${input.method},
      ${input.status},
      ${input.reference ?? null},
      ${input.txHash ?? null},
      ${input.cryptoAsset ?? null},
      ${input.adminNote ?? null},
      ${input.telegramChatId ?? null}
    )
  `;

  for (const item of input.items) {
    const itemId = createId('oi');
    await db`
      INSERT INTO order_items (id, order_id, product_id, title, quantity, price)
      VALUES (
        ${itemId},
        ${id},
        ${item.productId},
        ${item.title},
        ${item.quantity},
        ${item.price}
      )
    `;
  }

  const created = await getOrderById(id);
  if (!created) {
    throw new Error('Order created but could not be loaded');
  }
  return created;
}

/** Public view for customers — never includes delivery details. */
export async function getOrdersByEmail(email: string): Promise<DbOrder[]> {
  await ensureOrderSchema();
  const db = getDb();
  const normalized = email.trim().toLowerCase();

  const rows = await db`
    SELECT o.*, i.product_id, i.title, i.quantity, i.price
    FROM orders o
    LEFT JOIN order_items i ON i.order_id = o.id
    WHERE o.email = ${normalized}
    ORDER BY o.created_at DESC, i.title ASC
  `;

  return mapOrderRows(rows as Array<Record<string, unknown>>).map(toPublicOrder);
}

export async function getOrderById(id: string): Promise<AdminOrder | null> {
  await ensureOrderSchema();
  const db = getDb();
  const rows = await db`
    SELECT o.*, i.product_id, i.title, i.quantity, i.price
    FROM orders o
    LEFT JOIN order_items i ON i.order_id = o.id
    WHERE o.id = ${id}
    ORDER BY i.title ASC
  `;

  if (!rows.length) return null;
  return mapOrderRows(rows as Array<Record<string, unknown>>)[0] ?? null;
}

export async function getOrderByReference(
  reference: string,
): Promise<AdminOrder | null> {
  await ensureOrderSchema();
  const db = getDb();
  const rows = await db`
    SELECT o.*, i.product_id, i.title, i.quantity, i.price
    FROM orders o
    LEFT JOIN order_items i ON i.order_id = o.id
    WHERE o.reference = ${reference}
    ORDER BY i.title ASC
  `;

  if (!rows.length) return null;
  return mapOrderRows(rows as Array<Record<string, unknown>>)[0] ?? null;
}

export async function isTxHashUsed(txHash: string): Promise<boolean> {
  await ensureOrderSchema();
  const db = getDb();
  const rows = await db`
    SELECT 1 FROM orders
    WHERE LOWER(tx_hash) = ${txHash.trim().toLowerCase()}
      AND status <> 'rejected'
    LIMIT 1
  `;
  return rows.length > 0;
}

export type AdminOrderFilter = 'queue' | 'pending' | 'delivered' | 'rejected' | 'all';

export async function listAdminOrders(
  filter: AdminOrderFilter = 'queue',
): Promise<AdminOrder[]> {
  await ensureOrderSchema();
  const db = getDb();
  const statuses: OrderStatus[] =
    filter === 'queue'
      ? REVIEW_STATUSES
      : filter === 'all'
        ? ['pending', ...REVIEW_STATUSES, 'delivered', 'rejected']
        : [filter];

  const rows = await db`
    SELECT o.*, i.product_id, i.title, i.quantity, i.price
    FROM orders o
    LEFT JOIN order_items i ON i.order_id = o.id
    WHERE o.status = ANY(${statuses})
    ORDER BY o.created_at DESC, i.title ASC
    LIMIT 1000
  `;

  return mapOrderRows(rows as Array<Record<string, unknown>>);
}

export async function countOrdersAwaitingReview(): Promise<number> {
  await ensureOrderSchema();
  const db = getDb();
  const rows = await db`
    SELECT COUNT(*)::int AS n FROM orders WHERE status = ANY(${REVIEW_STATUSES})
  `;
  return Number((rows[0] as { n?: number })?.n ?? 0);
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<void> {
  await ensureOrderSchema();
  const db = getDb();
  await db`UPDATE orders SET status = ${status} WHERE id = ${id}`;
}

export async function markOrderDelivered(
  id: string,
  deliveryDetails: string,
): Promise<AdminOrder | null> {
  await ensureOrderSchema();
  const db = getDb();
  await db`
    UPDATE orders
    SET status = 'delivered',
        delivery_details = ${deliveryDetails},
        admin_note = NULL,
        reviewed_at = NOW(),
        delivered_at = NOW()
    WHERE id = ${id}
  `;
  return getOrderById(id);
}

export async function markOrderRejected(
  id: string,
  reason: string,
): Promise<AdminOrder | null> {
  await ensureOrderSchema();
  const db = getDb();
  await db`
    UPDATE orders
    SET status = 'rejected',
        admin_note = ${reason},
        reviewed_at = NOW()
    WHERE id = ${id}
  `;
  return getOrderById(id);
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  return new Date(String(value)).toISOString();
}

function mapOrderRows(rows: Array<Record<string, unknown>>): AdminOrder[] {
  const map = new Map<string, AdminOrder>();
  for (const row of rows) {
    const id = String(row.id);
    if (!map.has(id)) {
      const chat = row.telegram_chat_id;
      map.set(id, {
        id,
        email: String(row.email),
        createdAt: new Date(String(row.created_at)).toISOString(),
        total: Number(row.total),
        method: String(row.method),
        status: row.status as OrderStatus,
        reference: row.reference ? String(row.reference) : null,
        txHash: row.tx_hash ? String(row.tx_hash) : null,
        cryptoAsset: row.crypto_asset ? String(row.crypto_asset) : null,
        adminNote: row.admin_note ? String(row.admin_note) : null,
        deliveredAt: toIso(row.delivered_at),
        deliveryDetails: row.delivery_details
          ? String(row.delivery_details)
          : null,
        telegramChatId:
          chat !== null && chat !== undefined && chat !== ''
            ? Number(chat)
            : null,
        reviewedAt: toIso(row.reviewed_at),
        items: [],
      });
    }
    if (row.product_id) {
      map.get(id)!.items.push({
        productId: String(row.product_id),
        title: String(row.title),
        quantity: Number(row.quantity),
        price: Number(row.price),
      });
    }
  }
  return [...map.values()];
}

export function toPublicOrder(order: AdminOrder): DbOrder {
  return {
    id: order.id,
    email: order.email,
    createdAt: order.createdAt,
    total: order.total,
    method: order.method,
    status: order.status,
    reference: order.reference ?? null,
    txHash: order.txHash ?? null,
    cryptoAsset: order.cryptoAsset ?? null,
    adminNote: order.status === 'rejected' ? (order.adminNote ?? null) : null,
    deliveredAt: order.deliveredAt ?? null,
    items: order.items,
  };
}

export type TelegramSessionData = {
  awaiting?: 'email' | 'txhash' | null;
  productId?: string;
  quantity?: number;
  email?: string;
  cryptoAsset?: string;
};

export async function getTelegramSession(
  chatId: number,
): Promise<TelegramSessionData> {
  await ensureOrderSchema();
  const db = getDb();
  const rows = await db`
    SELECT data FROM telegram_sessions WHERE chat_id = ${chatId} LIMIT 1
  `;
  if (!rows.length) return {};
  const raw = (rows[0] as { data?: unknown }).data;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as TelegramSessionData;
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === 'object') return raw as TelegramSessionData;
  return {};
}

export async function setTelegramSession(
  chatId: number,
  data: TelegramSessionData,
): Promise<void> {
  await ensureOrderSchema();
  const db = getDb();
  const payload = JSON.stringify(data);
  await db`
    INSERT INTO telegram_sessions (chat_id, data, updated_at)
    VALUES (${chatId}, ${payload}, NOW())
    ON CONFLICT (chat_id)
    DO UPDATE SET data = ${payload}, updated_at = NOW()
  `;
}
