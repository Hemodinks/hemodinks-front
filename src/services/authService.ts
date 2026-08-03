import type { LoginSessionResponse as LoginResponse } from '../shared/domain/sessionTypes';
import { post, refreshAuthSessionWithCookie } from './api';

export type ResetPasswordResponse = {
  id?: number;
  precisaTrocarSenha?: boolean;
  message: string;
  mode?: string | null;
};

export function authenticate(email: string, senha: string, clinicaSlug?: string) {
  return post<LoginResponse>('/api/users/authenticate', { email, senha }, undefined, {
    headers: clinicaSlug ? { 'X-Clinica-Slug': clinicaSlug } : undefined,
  });
}

export function refreshSession() {
  return refreshAuthSessionWithCookie();
}

export function recordSessionActivity(token: string) {
  return post<void>('/api/session/atividade', {}, token, { activity: false });
}

export function logoutSession() {
  return post<void>('/api/session/sair', {}, undefined, { activity: false });
}

export function resetPassword(email: string, clinicaSlug?: string) {
  return post<ResetPasswordResponse>('/api/users/password/reset', { email }, undefined, {
    headers: clinicaSlug ? { 'X-Clinica-Slug': clinicaSlug } : undefined,
  });
}

export function confirmPasswordReset(token: string, novaSenha: string) {
  const idempotencyKey =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  return post<{ id: number; precisaTrocarSenha: boolean; message: string }>(
    '/api/users/password/reset/confirm',
    { token, novaSenha },
    undefined,
    {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
}
