-- ByteStore orders schema (Neon Postgres)
-- Run once in Neon SQL Editor, or via: npm run db:setup

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  total         NUMERIC(12, 2) NOT NULL,
  method        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  reference     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (LOWER(email));
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    TEXT NOT NULL,
  title         TEXT NOT NULL,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  price         NUMERIC(12, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);
