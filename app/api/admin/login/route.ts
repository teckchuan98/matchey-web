import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  backendOrigin,
  createAdminSession,
} from '@/lib/admin/session';

export async function POST(request: NextRequest) {
  let password = '';
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === 'string') password = body.password;
  } catch {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }
  if (!password || password.length > 200) {
    return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
  }

  let backend: Response;
  try {
    backend = await fetch(`${backendOrigin()}/admin/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') ?? 'admin-web',
      },
      body: JSON.stringify({ password }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'Admin service is unavailable.' }, { status: 503 });
  }

  if (!backend.ok) {
    const status = backend.status === 429 ? 429 : backend.status === 503 ? 503 : 401;
    return NextResponse.json(
      { message: status === 429 ? 'Too many attempts. Try again later.' : 'Invalid credentials.' },
      { status },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_SECONDS,
  });
  return response;
}
