export const SESSION_ABSOLUTE_EXPIRED_CODE = 'session_absolute_expired';
export const SESSION_ABSOLUTE_EXPIRED_MESSAGE = 'Sua sessão atingiu o tempo máximo. Entre novamente.';

export function readSessionFailureCode(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null || !('code' in data)) return undefined;
  return data.code === SESSION_ABSOLUTE_EXPIRED_CODE || data.code === 'session_idle_expired'
    || data.code === 'session_reauthentication_required' ? data.code : undefined;
}
