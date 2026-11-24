import { ApiError, get, post } from './api';
import { beginSessionHandover, endSessionHandover } from './sessionHandover';

// #150: verificacao em duas etapas (TOTP) da propria conta. Segredo e codigos de recuperacao so existem
// em memoria, na tela que os mostra; nada disso vai para storage.
export type MfaStatus = {
  elegivel: boolean;
  habilitado: boolean;
  habilitadoEm?: string | null;
  codigosRecuperacaoRestantes: number;
};

export type MfaSetup = { segredo: string; otpAuthUri: string };
export type MfaActivation = { codigosRecuperacao: string[]; sessionRenewed: boolean };

export function getMfaStatus(token: string) {
  return get<MfaStatus>('/api/users/me/mfa', token);
}

export function beginMfaSetup(token: string) {
  return post<MfaSetup>('/api/users/me/mfa/configuracao', undefined, token);
}

// Ativar troca a SecurityVersion (sessoes sem o segundo fator caem). Com `sessionRenewed`, a API gravou o cookie
// de uma sessao nova so para o titular e o app a restaura (mesmo handover da troca de email, #286).
export async function activateMfa(senha: string, codigo: string, token: string): Promise<MfaActivation> {
  beginSessionHandover();
  let renewed = false;
  try {
    const result = await post<MfaActivation>('/api/users/me/mfa/ativacao', { senha, codigo }, token,
      { withCredentials: true, headers: { 'X-Session-Refresh': '1' } });
    if (!Array.isArray(result?.codigosRecuperacao)) throw new ApiError('Não foi possível confirmar a ativação. Confira sua conta.');
    renewed = result.sessionRenewed === true;
    return { codigosRecuperacao: result.codigosRecuperacao, sessionRenewed: renewed };
  } finally {
    if (!renewed) endSessionHandover();
  }
}

export function deactivateMfa(senha: string, codigo: string, token: string) {
  return post<void>('/api/users/me/mfa/desativacao', { senha, codigo }, token);
}
