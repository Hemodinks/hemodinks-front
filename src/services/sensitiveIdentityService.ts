import { ApiError, post } from './api';
import { beginSessionHandover, endSessionHandover } from './sessionHandover';

export type EmailChangeStarted = { requestId: string; expiresAt: string };

export async function requestEmailChange(senhaAtual: string, novoEmail: string, token: string) {
  const result = await post<EmailChangeStarted>('/api/users/email/change', { senhaAtual, novoEmail }, token);
  if (!result || typeof result.requestId !== 'string' || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(result.requestId)
    || typeof result.expiresAt !== 'string' || !Number.isFinite(Date.parse(result.expiresAt)))
    throw new ApiError('Não foi possível iniciar a confirmação. Seu email não foi alterado.');
  return { requestId: result.requestId, expiresAt: result.expiresAt };
}

// #286: com credenciais e o cabeçalho de requisição confiável, a API pode gravar o cookie de uma sessão nova
// (o token nunca vem no corpo; o app o obtém por /api/session/restaurar).
// Com sessão renovada, a pausa de expiração continua até o app restaurar a sessão nova (AppContent a encerra).
export async function confirmEmailChange(requestId: string, code: string, token: string) {
  beginSessionHandover();
  let renewed = false;
  try {
    const result = await post<{ code: string; sessionRenewed?: boolean }>('/api/users/email/change/confirm', { requestId, code }, token,
      { withCredentials: true, headers: { 'X-Session-Refresh': '1' } });
    if (result?.code !== 'identity_changed') throw new ApiError('Não foi possível confirmar a alteração. Confira sua conta antes de tentar novamente.');
    renewed = result.sessionRenewed === true;
    return { sessionRenewed: renewed };
  } finally {
    if (!renewed) endSessionHandover();
  }
}

export function cancelEmailChange(requestId: string, token: string) {
  return post<void>('/api/users/email/change/cancel', { requestId }, token);
}
