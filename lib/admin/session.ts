import 'server-only';

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'fittel_admin_session';
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters');
  return value;
}

function signature(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createAdminSession(): string {
  const expires = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS;
  const payload = `${expires}.${randomBytes(18).toString('base64url')}`;
  return `${payload}.${signature(payload)}`;
}

export function isValidAdminSession(value: string | undefined): boolean {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(signature(payload));
  const supplied = Buffer.from(parts[2]);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
  const expires = Number(parts[0]);
  return Number.isFinite(expires) && expires > Math.floor(Date.now() / 1000);
}

export function backendOrigin(): string {
  const configured = process.env.BACKEND_INTERNAL_ORIGIN;
  if (configured) return configured.replace(/\/$/, '');
  const publicBase = process.env.NEXT_PUBLIC_API_BASE;
  if (!publicBase) throw new Error('BACKEND_INTERNAL_ORIGIN is not configured');
  return publicBase.replace(/\/api\/?$/, '');
}
