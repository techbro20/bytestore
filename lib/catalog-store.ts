import { createHmac, timingSafeEqual } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { ensureOrderSchema, getDb, isDbConfigured } from '@/lib/db';

export type CatalogCategory = {
  slug: string;
  title: string;
  description: string;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  price: number;
  bestseller: boolean;
  newArrival: boolean;
  content: string;
  image?: string;
};

export type CatalogTool = {
  id: string;
  title: string;
  body: string;
  href: string;
  image?: string;
};

export type Catalog = {
  categories: CatalogCategory[];
  products: CatalogProduct[];
  tools: CatalogTool[];
};

const DATA_PATH = path.join(process.cwd(), 'data', 'catalog.json');

let seedPromise: Promise<void> | null = null;

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function mapProduct(row: Record<string, unknown>): CatalogProduct {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: String(row.description ?? ''),
    category: String(row.category),
    price: Number(row.price) || 0,
    bestseller: Boolean(row.bestseller),
    newArrival: Boolean(row.new_arrival),
    content: String(row.content ?? ''),
    image: row.image ? String(row.image) : '',
  };
}

function mapCategory(row: Record<string, unknown>): CatalogCategory {
  return {
    slug: String(row.slug),
    title: String(row.title),
    description: String(row.description ?? ''),
  };
}

function mapTool(row: Record<string, unknown>): CatalogTool {
  return {
    id: String(row.id),
    title: String(row.title),
    body: String(row.body ?? ''),
    href: String(row.href ?? '/shop'),
    image: row.image ? String(row.image) : '',
  };
}

async function readJsonCatalogFallback(): Promise<Catalog> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Catalog;
    return {
      categories: parsed.categories || [],
      products: parsed.products || [],
      tools: parsed.tools || [],
    };
  } catch {
    return { categories: [], products: [], tools: [] };
  }
}

async function seedCatalogFromJsonIfEmpty() {
  if (!isDbConfigured()) return;
  if (!seedPromise) {
    seedPromise = (async () => {
      await ensureOrderSchema();
      const db = getDb();
      const counts = await db`
        SELECT
          (SELECT COUNT(*)::int FROM categories) AS categories,
          (SELECT COUNT(*)::int FROM products) AS products,
          (SELECT COUNT(*)::int FROM tools) AS tools
      `;
      const row = counts[0] as {
        categories?: number;
        products?: number;
        tools?: number;
      };
      const total =
        Number(row.categories || 0) +
        Number(row.products || 0) +
        Number(row.tools || 0);
      if (total > 0) return;

      const seed = await readJsonCatalogFallback();
      if (
        !seed.categories.length &&
        !seed.products.length &&
        !seed.tools.length
      ) {
        return;
      }

      for (const category of seed.categories) {
        await db`
          INSERT INTO categories (slug, title, description)
          VALUES (
            ${category.slug},
            ${category.title},
            ${category.description || ''}
          )
          ON CONFLICT (slug) DO NOTHING
        `;
      }
      for (const product of seed.products) {
        await db`
          INSERT INTO products (
            id, slug, title, description, category, price,
            bestseller, new_arrival, content, image
          )
          VALUES (
            ${product.id},
            ${product.slug},
            ${product.title},
            ${product.description || ''},
            ${product.category},
            ${product.price || 0},
            ${Boolean(product.bestseller)},
            ${Boolean(product.newArrival)},
            ${product.content || ''},
            ${product.image || ''}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
      for (const tool of seed.tools) {
        await db`
          INSERT INTO tools (id, title, body, href, image)
          VALUES (
            ${tool.id},
            ${tool.title},
            ${tool.body || ''},
            ${tool.href || '/shop'},
            ${tool.image || ''}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
    })();
  }
  try {
    await seedPromise;
  } catch (error) {
    seedPromise = null;
    console.error('[catalog seed]', error);
  }
}

export async function readCatalog(): Promise<Catalog> {
  if (!isDbConfigured()) {
    return readJsonCatalogFallback();
  }

  await ensureOrderSchema();
  await seedCatalogFromJsonIfEmpty();
  const db = getDb();

  const [categoryRows, productRows, toolRows] = await Promise.all([
    db`SELECT slug, title, description FROM categories ORDER BY title ASC`,
    db`
      SELECT
        id, slug, title, description, category, price,
        bestseller, new_arrival, content, image
      FROM products
      ORDER BY title ASC
    `,
    db`SELECT id, title, body, href, image FROM tools ORDER BY title ASC`,
  ]);

  return {
    categories: (categoryRows as Array<Record<string, unknown>>).map(mapCategory),
    products: (productRows as Array<Record<string, unknown>>).map(mapProduct),
    tools: (toolRows as Array<Record<string, unknown>>).map(mapTool),
  };
}

export async function insertCategory(category: CatalogCategory) {
  await ensureOrderSchema();
  const db = getDb();
  await db`
    INSERT INTO categories (slug, title, description)
    VALUES (${category.slug}, ${category.title}, ${category.description || ''})
  `;
  return category;
}

export async function updateCategory(
  slug: string,
  patch: Partial<Pick<CatalogCategory, 'title' | 'description'>>,
) {
  await ensureOrderSchema();
  const db = getDb();
  const rows = await db`
    SELECT slug, title, description FROM categories WHERE slug = ${slug} LIMIT 1
  `;
  if (!rows.length) return null;
  const current = mapCategory(rows[0] as Record<string, unknown>);
  const next: CatalogCategory = {
    slug,
    title: patch.title?.trim() || current.title,
    description:
      patch.description !== undefined
        ? patch.description.trim()
        : current.description,
  };
  await db`
    UPDATE categories
    SET title = ${next.title}, description = ${next.description}
    WHERE slug = ${slug}
  `;
  return next;
}

export async function deleteCategory(slug: string) {
  await ensureOrderSchema();
  const db = getDb();
  // Products cascade via FK
  await db`DELETE FROM categories WHERE slug = ${slug}`;
}

export async function getCategoryBySlug(slug: string) {
  await ensureOrderSchema();
  const db = getDb();
  const rows = await db`
    SELECT slug, title, description FROM categories WHERE slug = ${slug} LIMIT 1
  `;
  if (!rows.length) return null;
  return mapCategory(rows[0] as Record<string, unknown>);
}

export async function insertProduct(product: CatalogProduct) {
  await ensureOrderSchema();
  const db = getDb();
  await db`
    INSERT INTO products (
      id, slug, title, description, category, price,
      bestseller, new_arrival, content, image
    )
    VALUES (
      ${product.id},
      ${product.slug},
      ${product.title},
      ${product.description || ''},
      ${product.category},
      ${product.price || 0},
      ${Boolean(product.bestseller)},
      ${Boolean(product.newArrival)},
      ${product.content || ''},
      ${product.image || ''}
    )
  `;
  return product;
}

export async function updateProduct(
  id: string,
  patch: Partial<CatalogProduct>,
): Promise<CatalogProduct | null> {
  await ensureOrderSchema();
  const db = getDb();
  const rows = await db`
    SELECT
      id, slug, title, description, category, price,
      bestseller, new_arrival, content, image
    FROM products
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!rows.length) return null;
  const current = mapProduct(rows[0] as Record<string, unknown>);
  const next: CatalogProduct = {
    ...current,
    title: patch.title?.trim() ?? current.title,
    description: patch.description?.trim() ?? current.description,
    category: patch.category ?? current.category,
    price:
      patch.price !== undefined && patch.price !== null
        ? Number(patch.price)
        : current.price,
    bestseller:
      patch.bestseller !== undefined
        ? Boolean(patch.bestseller)
        : current.bestseller,
    newArrival:
      patch.newArrival !== undefined
        ? Boolean(patch.newArrival)
        : current.newArrival,
    content: patch.content?.trim() ?? current.content,
    image: patch.image !== undefined ? patch.image : current.image,
    slug: patch.slug?.trim() || current.slug,
  };
  await db`
    UPDATE products SET
      slug = ${next.slug},
      title = ${next.title},
      description = ${next.description || ''},
      category = ${next.category},
      price = ${next.price || 0},
      bestseller = ${Boolean(next.bestseller)},
      new_arrival = ${Boolean(next.newArrival)},
      content = ${next.content || ''},
      image = ${next.image || ''}
    WHERE id = ${id}
  `;
  return next;
}

export async function deleteProduct(id: string) {
  await ensureOrderSchema();
  const db = getDb();
  await db`DELETE FROM products WHERE id = ${id}`;
}

export async function getProductById(id: string) {
  await ensureOrderSchema();
  const db = getDb();
  const rows = await db`
    SELECT
      id, slug, title, description, category, price,
      bestseller, new_arrival, content, image
    FROM products
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!rows.length) return null;
  return mapProduct(rows[0] as Record<string, unknown>);
}

export async function insertTool(tool: CatalogTool) {
  await ensureOrderSchema();
  const db = getDb();
  await db`
    INSERT INTO tools (id, title, body, href, image)
    VALUES (
      ${tool.id},
      ${tool.title},
      ${tool.body || ''},
      ${tool.href || '/shop'},
      ${tool.image || ''}
    )
  `;
  return tool;
}

export async function updateTool(
  id: string,
  patch: Partial<CatalogTool>,
): Promise<CatalogTool | null> {
  await ensureOrderSchema();
  const db = getDb();
  const rows = await db`
    SELECT id, title, body, href, image FROM tools WHERE id = ${id} LIMIT 1
  `;
  if (!rows.length) return null;
  const current = mapTool(rows[0] as Record<string, unknown>);
  const next: CatalogTool = {
    ...current,
    title: patch.title?.trim() ?? current.title,
    body: patch.body?.trim() ?? current.body,
    href: patch.href?.trim() ?? current.href,
    image: patch.image !== undefined ? patch.image : current.image,
  };
  await db`
    UPDATE tools SET
      title = ${next.title},
      body = ${next.body || ''},
      href = ${next.href || '/shop'},
      image = ${next.image || ''}
    WHERE id = ${id}
  `;
  return next;
}

export async function deleteTool(id: string) {
  await ensureOrderSchema();
  const db = getDb();
  await db`DELETE FROM tools WHERE id = ${id}`;
}

export function getAdminToken() {
  const password = process.env.ADMIN_PASSWORD || 'bytestore-admin';
  return createHmac('sha256', password).update('bytestore-admin-session').digest('hex');
}

export function isValidAdminToken(token: string | undefined | null) {
  if (!token) return false;
  const expected = getAdminToken();
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function checkAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD || 'bytestore-admin';
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function makeProductSlug(title: string, existing: CatalogProduct[]) {
  let base = slugify(title) || `product-${Date.now()}`;
  let slug = base;
  let i = 2;
  while (existing.some((p) => p.slug === slug)) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export function makeCategorySlug(title: string, existing: CatalogCategory[]) {
  let base = slugify(title) || `category-${Date.now()}`;
  let slug = base;
  let i = 2;
  while (existing.some((c) => c.slug === slug)) {
    slug = `${base}-${i++}`;
  }
  return slug;
}
