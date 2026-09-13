import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isValidAdminToken } from '@/lib/catalog-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const jar = await cookies();
  const ok = isValidAdminToken(jar.get('bs_admin')?.value);
  return NextResponse.json({ authenticated: ok });
}
