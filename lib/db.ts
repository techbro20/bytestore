import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { DbOrder, DbOrderItem, OrderStatus } from './order-types';

export type { DbOrder, DbOrderItem, OrderStatus } from './order-types';

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
  items: DbOrderItem[];
}): Promise<DbOrder> {
  await ensureOrderSchema();
  const db = getDb();
  const id = createId('ord');
  const email = input.email.trim().toLowerCase();

  await db`
    INSERT INTO orders (id, email, total, method, status, reference)
    VALUES (
      ${id},
      ${email},
      ${input.total},
      ${input.method},
      ${input.status},
      ${input.reference ?? null}
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

  const orders = await getOrdersByEmail(email);
  const created = orders.find((o) => o.id === id);
  if (!created) {
    throw new Error('Order created but could not be loaded');
  }
  return created;
}

export async function getOrdersByEmail(email: string): Promise<DbOrder[]> {
  await ensureOrderSchema();
  const db = getDb();
  const normalized = email.trim().toLowerCase();

  const rows = await db`
    SELECT
      o.id,
      o.email,
      o.total,
      o.method,
      o.status,
      o.reference,
      o.created_at,
      i.product_id,
      i.title,
      i.quantity,
      i.price
    FROM orders o
    LEFT JOIN order_items i ON i.order_id = o.id
    WHERE o.email = ${normalized}
    ORDER BY o.created_at DESC, i.title ASC
  `;

  const map = new Map<string, DbOrder>();
  for (const row of rows as Array<Record<string, unknown>>) {
    const id = String(row.id);
    if (!map.has(id)) {
      map.set(id, {
        id,
        email: String(row.email),
        createdAt: new Date(String(row.created_at)).toISOString(),
        total: Number(row.total),
        method: String(row.method),
        status: row.status as OrderStatus,
        reference: row.reference ? String(row.reference) : null,
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

export async function getOrderById(id: string): Promise<DbOrder | null> {
  await ensureOrderSchema();
  const db = getDb();
  const rows = await db`
    SELECT
      o.id,
      o.email,
      o.total,
      o.method,
      o.status,
      o.reference,
      o.created_at,
      i.product_id,
      i.title,
      i.quantity,
      i.price
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
): Promise<DbOrder | null> {
  await ensureOrderSchema();
  const db = getDb();
  const rows = await db`
    SELECT
      o.id,
      o.email,
      o.total,
      o.method,
      o.status,
      o.reference,
      o.created_at,
      i.product_id,
      i.title,
      i.quantity,
      i.price
    FROM orders o
    LEFT JOIN order_items i ON i.order_id = o.id
    WHERE o.reference = ${reference}
    ORDER BY i.title ASC
  `;

  if (!rows.length) return null;
  return mapOrderRows(rows as Array<Record<string, unknown>>)[0] ?? null;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<void> {
  await ensureOrderSchema();
  const db = getDb();
  await db`UPDATE orders SET status = ${status} WHERE id = ${id}`;
}

function mapOrderRows(rows: Array<Record<string, unknown>>): DbOrder[] {
  const map = new Map<string, DbOrder>();
  for (const row of rows) {
    const id = String(row.id);
    if (!map.has(id)) {
      map.set(id, {
        id,
        email: String(row.email),
        createdAt: new Date(String(row.created_at)).toISOString(),
        total: Number(row.total),
        method: String(row.method),
        status: row.status as OrderStatus,
        reference: row.reference ? String(row.reference) : null,
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

export type TelegramSessionData = {
  awaiting?: 'email' | null;
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
