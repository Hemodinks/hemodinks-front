import type { LoginResponse } from '../types';
import { post } from './api';

export type ResetPasswordResponse = {
  id?: number;
  precisaTrocarSenha?: boolean;
  message: string;
  mode?: string | null;
};

export function authenticate(email: string, senha: string) {
  return post<LoginResponse>('/api/users/authenticate', { email, senha });
}

export function resetPassword(email: string) {
  return post<ResetPasswordResponse>('/api/users/password/reset', { email });
}

export function confirmPasswordReset(token: string, novaSenha: string) {
  const idempotencyKey = typeof crypto !== 'undefined' && 'randomUUID' in crypto
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
