const messages = {
  identity_revalidation_failed: 'Não foi possível confirmar sua identidade para esta ação. Confirme novamente ou entre com sua conta individual.',
  individual_identity_required: 'Entre com sua conta individual para alterar senha ou email. A credencial da equipe não comprova identidade individual.',
  email_confirmation_required: 'Use a alteração de email de autenticação nas preferências da sua conta e confirme o novo endereço.',
  email_change_unavailable: 'Não foi possível utilizar este endereço para a alteração.',
  invalid_new_email: 'Informe um endereço de email válido.',
  email_confirmation_unavailable: 'Não foi possível enviar a confirmação. Tente novamente mais tarde. Seu email não foi alterado.',
  identity_change_conflict: 'A alteração não foi concluída. Confirme novamente antes de tentar outra vez.',
} as const;

export function readSensitiveIdentityError(data: unknown) {
  if (typeof data !== 'object' || data === null || !('code' in data)
    || typeof data.code !== 'string' || !Object.hasOwn(messages, data.code)) return undefined;
  const code = data.code as keyof typeof messages;
  return { code, message: messages[code] };
}
