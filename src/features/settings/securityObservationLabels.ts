// Display labels for the API #148 catalog; no detection or correlation runs here.
export const securityEventLabels: Record<string, string> = {
  AuthenticationSucceeded: 'Autenticação concluída',
  AuthenticationRefused: 'Autenticação recusada',
  CredentialValidated: 'Credencial validada (etapa intermediária)',
  Throttled: 'Limite de tentativas atingido',
  RecoveryRequested: 'Recuperação solicitada',
  RecoveryCompleted: 'Recuperação concluída',
  RecoveryRefused: 'Recuperação recusada',
  CredentialChanged: 'Senha alterada',
  CredentialRevoked: 'Credencial revogada',
  SessionRevoked: 'Sessão revogada',
  TemporaryConflict: 'Conflito temporário',
  SessionExpired: 'Sessão expirada',
  SessionRejected: 'Sessão recusada',
  AuthorizationDenied: 'Autorização negada',
  InfrastructureFailure: 'Falha de infraestrutura',
  SessionValidated: 'Sessão validada',
  SuspiciousPattern: 'Padrão suspeito observado',
};

export const securityOperationLabels: Record<string, string> = {
  login: 'Login', discovery: 'Seleção de clínica', operator: 'Identificação de operador',
  recovery: 'Recuperação de acesso', recovery_confirm: 'Confirmação de recuperação',
  credential_change: 'Alteração de senha', credential_revoke: 'Revogação de credencial',
  bootstrap: 'Restauração de sessão', authorization: 'Autorização', session: 'Sessão',
  other: 'Outra operação', detection: 'Observação de padrões',
};

export const securityReasonLabels: Record<string, string> = {
  invalid_credential: 'Credencial inválida', authorization_denied: 'Acesso negado',
  infrastructure_failure: 'Infraestrutura indisponível', temporary_conflict: 'Conflito temporário',
  session_validation_busy: 'Validação de sessão ocupada', session_refresh_conflict: 'Conflito na renovação de sessão',
  absolute_expired: 'Tempo máximo de sessão atingido', idle_expired: 'Sessão expirada por inatividade',
  session_invalid: 'Sessão inválida', rate_limited: 'Limite de tentativas atingido',
  invalid_request: 'Solicitação inválida', completed: 'Operação concluída', unspecified: 'Não especificado',
  account_failures: 'Muitas recusas para uma conta', multiple_accounts: 'Recusas em múltiplas contas',
  session_error_growth: 'Aumento de erros de sessão',
};

export function securityLabel(labels: Record<string, string>, value: string, fallback: string) {
  return Object.hasOwn(labels, value) ? labels[value] : fallback;
}
