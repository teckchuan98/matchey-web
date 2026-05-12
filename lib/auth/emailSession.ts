'use client';

import { api } from '@/lib/api/client';
import { setCurrentToken } from './tokenRef';

const STORAGE_KEY = 'fittel.emailSession';
const CHANGE_EVENT = 'fittel:emailSession';

export type EmailSession = {
  token: string;
  email: string;
  expiresAt: string;
};

export type SendCodeIntent = 'sign_in' | 'sign_up';

export type VerifyCodeResponse = {
  token: string;
  expiresAt: string;
  isNewUser: boolean;
};

export function emailSessionGet(): EmailSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EmailSession;
    if (!parsed.token || !parsed.expiresAt) return null;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function emailSessionStore(session: EmailSession): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  setCurrentToken(session.token);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function emailSessionClear(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function subscribeEmailSession(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

export async function sendEmailCode(
  email: string,
  intent: SendCodeIntent = 'sign_in',
): Promise<void> {
  await api('/auth/email/send-code', { method: 'POST', json: { email, intent } });
}

export async function verifyEmailCode(
  email: string,
  code: string,
  intent: SendCodeIntent = 'sign_in',
): Promise<VerifyCodeResponse> {
  const res = await api<VerifyCodeResponse>('/auth/email/verify-code', {
    method: 'POST',
    json: { email, code, intent },
  });
  emailSessionStore({ token: res.token, email, expiresAt: res.expiresAt });
  return res;
}

export async function emailSessionLogout(): Promise<void> {
  try {
    await api('/auth/email/logout', { method: 'POST' });
  } catch {
    // Best-effort — clear locally either way.
  }
  emailSessionClear();
}
