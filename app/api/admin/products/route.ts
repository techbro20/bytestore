import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { isDbConfigured } from '@/lib/db';
import {
  deleteProduct,
  ensureToolsCategory,
  getCategoryBySlug,
  getProductById,
  insertProduct,
  isValidAdminToken,
  makeProductSlug,
  readCatalog,
  updateProduct,
  type CatalogProduct,
} from '@/lib/catalog-store';
import { announceProductUpdate } from '@/lib/telegram/announce';
import { TOOLS_CATEGORY } from '@/lib/tools-category';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const jar = await cookies();
  return isValidAdminToken(jar.get('bs_admin')?.value);
}

function requireDb() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );
  }
  return null;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dbError = requireDb();
  if (dbError) return dbError;
  const catalog = await readCatalog();
  return NextResponse.json(catalog.products);
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dbError = requireDb();
  if (dbError) return dbError;

  const body = (await request.json()) as Partial<CatalogProduct>;
  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }
  if (!body.category?.trim()) {
    return NextResponse.json({ error: 'Category required' }, { status: 400 });
  }
  if (body.category === TOOLS_CATEGORY.slug) {
    await ensureToolsCategory();
  }

  const category = await getCategoryBySlug(body.category);
  if (!category) {
    return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
  }

  const catalog = await readCatalog();
  const product: CatalogProduct = {
    id: randomUUID(),
    slug: body.slug?.trim() || makeProductSlug(body.title, catalog.products),
    title: body.title.trim(),
    description: body.description?.trim() || '',
    category: body.category,
    price: Number(body.price) || 0,
    bestseller: Boolean(body.bestseller),
    newArrival: Boolean(body.newArrival),
    content: body.content?.trim() || '',
    image: body.image || '',
  };

  await insertProduct(product);
  void announceProductUpdate(product, 'new');
  return NextResponse.json({ ok: true, product });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dbError = requireDb();
  if (dbError) return dbError;

  const body = (await request.json()) as Partial<CatalogProduct> & { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  if (body.category) {
    if (body.category === TOOLS_CATEGORY.slug) {
      await ensureToolsCategory();
    }
    const category = await getCategoryBySlug(body.category);
    if (!category) {
      return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
    }
  }

  const product = await updateProduct(body.id, body);
  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  void announceProductUpdate(product, 'updated');
  return NextResponse.json({ ok: true, product });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dbError = requireDb();
  if (dbError) return dbError;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  const existing = await getProductById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await deleteProduct(id);
  return NextResponse.json({ ok: true });
}
