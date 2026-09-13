import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { isDbConfigured } from '@/lib/db';
import {
  deleteTool,
  insertTool,
  isValidAdminToken,
  readCatalog,
  updateTool,
  type CatalogTool,
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
