import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isDbConfigured } from '@/lib/db';
import {
  deleteCategory,
  getCategoryBySlug,
  insertCategory,
  isValidAdminToken,
  makeCategorySlug,
  readCatalog,
  updateCategory,
} from '@/lib/catalog-store';

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
  return NextResponse.json(catalog.categories);
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dbError = requireDb();
  if (dbError) return dbError;

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    slug?: string;
  };
  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  const catalog = await readCatalog();
  const slug =
    body.slug?.trim() || makeCategorySlug(body.title, catalog.categories);
  if (catalog.categories.some((c) => c.slug === slug)) {
    return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
  }

  const category = await insertCategory({
    slug,
    title: body.title.trim(),
    description: body.description?.trim() || '',
  });
  return NextResponse.json({ ok: true, category });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dbError = requireDb();
  if (dbError) return dbError;

  const body = (await request.json()) as {
    slug?: string;
    title?: string;
    description?: string;
  };
  if (!body.slug) {
    return NextResponse.json({ error: 'Slug required' }, { status: 400 });
  }

  const category = await updateCategory(body.slug, {
    title: body.title,
    description: body.description,
  });
  if (!category) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, category });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dbError = requireDb();
  if (dbError) return dbError;

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'Slug required' }, { status: 400 });
  }
  const existing = await getCategoryBySlug(slug);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await deleteCategory(slug);
  return NextResponse.json({ ok: true });
}
