const messages = {
  password_compromised: 'Esta senha é comum ou consta na base de senhas comprometidas. Escolha outra senha ou uma frase-senha mais longa.',
  password_policy_unavailable: 'Não foi possível verificar a nova senha agora. Tente novamente mais tarde; sua senha não foi alterada.',
} as const;

// Only API decisions are recognized here; candidate passwords are never inspected.
export function readPasswordPolicyError(data: unknown) {
  if (typeof data !== 'object' || data === null || !('code' in data)) return undefined;
  const code = data.code;
  if (code !== 'password_compromised' && code !== 'password_policy_unavailable') return undefined;
  return { code, message: messages[code] };
}

export function isPasswordPolicyError(error: unknown) {
  return error instanceof Error && readPasswordPolicyError(error) !== undefined;
}
