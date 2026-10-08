import { ApiError, post } from './api';

export type EmailChangeStarted = { requestId: string; expiresAt: string };

export async function requestEmailChange(senhaAtual: string, novoEmail: string, token: string) {
  const result = await post<EmailChangeStarted>('/api/users/email/change', { senhaAtual, novoEmail }, token);
  if (!result || typeof result.requestId !== 'string' || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(result.requestId)
    || typeof result.expiresAt !== 'string' || !Number.isFinite(Date.parse(result.expiresAt)))
    throw new ApiError('Não foi possível iniciar a confirmação. Seu email não foi alterado.');
  return { requestId: result.requestId, expiresAt: result.expiresAt };
}

export async function confirmEmailChange(requestId: string, code: string, token: string) {
  const result = await post<{ code: string }>('/api/users/email/change/confirm', { requestId, code }, token);
  if (result?.code !== 'identity_changed') throw new ApiError('Não foi possível confirmar a alteração. Confira sua conta antes de tentar novamente.');
}

export function cancelEmailChange(requestId: string, token: string) {
  return post<void>('/api/users/email/change/cancel', { requestId }, token);
}
