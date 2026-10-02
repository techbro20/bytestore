import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { isDbConfigured } from '@/lib/db';
import {
  deleteTool,
  ensureToolsCategory,
  insertProduct,
  insertTool,
  isValidAdminToken,
  makeProductSlug,
  readCatalog,
  updateTool,
  type CatalogProduct,
  type CatalogTool,
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
  return NextResponse.json(catalog.tools);
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dbError = requireDb();
  if (dbError) return dbError;

  const body = (await request.json()) as Partial<CatalogTool>;
  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }
  const tool: CatalogTool = {
    id: randomUUID(),
    title: body.title.trim(),
    body: body.body?.trim() || '',
    href: body.href?.trim() || '/shop',
    image: body.image || '',
  };
  await insertTool(tool);
  return NextResponse.json({ ok: true, tool });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dbError = requireDb();
  if (dbError) return dbError;

  const body = (await request.json()) as Partial<CatalogTool> & { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  const tool = await updateTool(body.id, body);
  if (!tool) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, tool });
}

/** Converts an old link-only tool into a priced product in the Tools category. */
export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dbError = requireDb();
  if (dbError) return dbError;

  const body = (await request.json()) as { id?: string; price?: number };
  const price = Math.round(Number(body.price) * 100) / 100;
  if (!body.id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  if (!(price > 0)) {
    return NextResponse.json({ error: 'Enter a price greater than 0' }, { status: 400 });
  }

  const catalog = await readCatalog();
  const tool = catalog.tools.find((t) => t.id === body.id);
  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
  }

  await ensureToolsCategory();
  const product: CatalogProduct = {
    id: randomUUID(),
    slug: makeProductSlug(tool.title, catalog.products),
    title: tool.title,
    description: tool.body,
    category: TOOLS_CATEGORY.slug,
    price,
    bestseller: false,
    newArrival: false,
    content: '',
    image: tool.image || '',
  };
  await insertProduct(product);
  await deleteTool(tool.id);
  void announceProductUpdate(product, 'new');

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
  await deleteTool(id);
  return NextResponse.json({ ok: true });
}
