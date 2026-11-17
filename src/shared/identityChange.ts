// Resultado da confirmação de troca de email (#286). Com `sessionRenewed`, a API já revogou as sessões antigas e
// gravou o cookie de uma sessão nova só para o titular: o app restaura essa sessão em vez de mandar ao login.
export type IdentityChangeOutcome = { sessionRenewed: boolean; email: string };

export type IdentityChangedHandler = (message: string, outcome?: IdentityChangeOutcome) => void;

export const EMAIL_CHANGED_RELOGIN_MESSAGE = 'Email alterado. Entre novamente com o novo email e a mesma senha.';

// A sessão nova remonta a área autenticada (como a troca de clínica), e o aviso de sucesso se perderia.
// Fica só em memória (nunca em storage), vinculado ao usuário, por pouco tempo, e é limpo no logout.
const NOTICE_TTL_MS = 60_000;
let notice: { userId: number; text: string; expiresAt: number } | null = null;

export function setIdentityNotice(userId: number, text: string) {
  notice = { userId, text, expiresAt: Date.now() + NOTICE_TTL_MS };
}

export function peekIdentityNotice(userId: number) {
  if (!notice || notice.userId !== userId || Date.now() >= notice.expiresAt) return '';
  return notice.text;
}

export function clearIdentityNotice() {
  notice = null;
}
