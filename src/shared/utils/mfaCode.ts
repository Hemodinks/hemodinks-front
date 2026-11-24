// #150: campo do segundo fator. Só dígitos = código do aplicativo (6); com letras = código de recuperação
// (10 caracteres, exibido como XXXXX-XXXXX). O limite vale também para texto colado.
export const MFA_TOTP_LENGTH = 6;
export const MFA_RECOVERY_LENGTH = 10;
export const MFA_CODE_MAX_LENGTH = MFA_RECOVERY_LENGTH + 1;

export function formatMfaCode(value: string) {
  const raw = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  if (/^[0-9]*$/.test(raw)) return raw.slice(0, MFA_TOTP_LENGTH);
  const recovery = raw.slice(0, MFA_RECOVERY_LENGTH);
  return recovery.length > 5 ? `${recovery.slice(0, 5)}-${recovery.slice(5)}` : recovery;
}

export function isCompleteMfaCode(value: string) {
  return /^[0-9]{6}$/.test(value) || value.replace(/-/g, '').length === MFA_RECOVERY_LENGTH;
}
