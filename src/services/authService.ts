import type { LoginResponse } from '../types';
import { post } from './api';

export function authenticate(email: string, senha: string) {
  return post<LoginResponse>('/api/users/authenticate', { email, senha });
}

export function resetPassword(email: string) {
  return post<{ id: number; precisaTrocarSenha: boolean; message: string }>('/api/users/password/reset', { email });
}
