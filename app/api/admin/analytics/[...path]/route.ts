import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, backendOrigin, isValidAdminSession } from '@/lib/admin/session';

const ALLOWED = new Set([
  'overview',
  'retention',
  'features',
  'game-social',
  'feedback',
  'users',
  'top-meal-loggers',
  'top-exercises',
  'subscriptions',
]);

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!isValidAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ message: 'Admin session expired.' }, { status: 401 });
  }
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return NextResponse.json({ message: 'Admin API is not configured.' }, { status: 503 });

  const { path } = await context.params;
  if (!path.length || !ALLOWED.has(path[0]) || path.some((part) => part.includes('..'))) {
    return NextResponse.json({ message: 'Unknown analytics route.' }, { status: 404 });
  }
  const upstream = new URL(`${backendOrigin()}/admin/analytics/${path.map(encodeURIComponent).join('/')}`);
  request.nextUrl.searchParams.forEach((value, key) => upstream.searchParams.append(key, value));
  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers: { 'X-Admin-Token': token },
      cache: 'no-store',
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json({ message: 'Analytics backend is unavailable.' }, { status: 503 });
  }
}

export const GET = proxy;
