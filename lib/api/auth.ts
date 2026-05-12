import { api } from './client';

export type AuthRole = 'TRAINER' | 'CLIENT' | 'UNREGISTERED';

export interface AuthCheckResponse {
  role: AuthRole;
  isNewUser: boolean;
  trainer: Record<string, unknown> | null;
  client: Record<string, unknown> | null;
}

export function authCheck(): Promise<AuthCheckResponse> {
  return api<AuthCheckResponse>('/auth/check', { method: 'POST', json: {} });
}
