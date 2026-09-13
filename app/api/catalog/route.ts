import { NextResponse } from 'next/server';
import { readCatalog } from '@/lib/catalog-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const catalog = await readCatalog();
  return NextResponse.json(catalog);
}
