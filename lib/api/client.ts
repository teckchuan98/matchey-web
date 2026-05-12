import { getFirebaseAuth } from '@/lib/auth/firebase';
import { getCurrentToken, setCurrentToken } from '@/lib/auth/tokenRef';

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | null,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type JsonBody = Record<string, unknown> | unknown[] | null;

export type ApiRequest = Omit<RequestInit, 'body'> & {
  json?: JsonBody;
};

async function forceRefreshToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return null;
  const fresh = await user.getIdToken(true);
  setCurrentToken(fresh);
  return fresh;
}

async function doFetch(url: string, init: ApiRequest, token: string | null): Promise<Response> {
  const headers = new Headers(init.headers);
  const body = init.json !== undefined ? JSON.stringify(init.json) : undefined;
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const { json: _json, ...rest } = init;
  return fetch(url, { ...rest, headers, body });
}

export async function api<T = unknown>(path: string, init: ApiRequest = {}): Promise<T> {
  const url = `${BASE}${path}`;

  let res = await doFetch(url, init, getCurrentToken());
  if (res.status === 401) {
    const fresh = await forceRefreshToken();
    if (fresh) res = await doFetch(url, init, fresh);
  }

  if (!res.ok) {
    let body: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    const message =
      isObject(body) && typeof body.message === 'string' ? body.message : `HTTP ${res.status}`;
    const code = isObject(body) && typeof body.code === 'string' ? body.code : null;
    throw new ApiError(res.status, code, message, body);
  }

  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
