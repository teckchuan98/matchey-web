import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, backendOrigin, isValidAdminSession } from '@/lib/admin/session';

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!isValidAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ message: 'Admin session expired.' }, { status: 401 });
  }
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) {
    return NextResponse.json({ message: 'Admin API is not configured.' }, { status: 503 });
  }

  const { path } = await context.params;
  if (!path.length || path[0] !== 'submissions' || path.some((part) => part.includes('..'))) {
    return NextResponse.json({ message: 'Unknown catalogue route.' }, { status: 404 });
  }
  const upstream = new URL(
    `${backendOrigin()}/admin/nutrition-catalog/${path.map(encodeURIComponent).join('/')}`,
  );
  request.nextUrl.searchParams.forEach((value, key) => upstream.searchParams.append(key, value));
  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers: {
        'X-Admin-Token': token,
        ...(request.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      body: request.method === 'POST' ? await request.text() : undefined,
      cache: 'no-store',
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'Catalogue backend is unavailable.' },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
