import { NextResponse } from 'next/server';
import { checkAdminPassword, getAdminToken } from '@/lib/catalog-store';

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string };
  if (!body.password || !checkAdminPassword(body.password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('bs_admin', getAdminToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('bs_admin', '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
