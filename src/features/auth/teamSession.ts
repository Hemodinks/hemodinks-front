import type { AuthSession } from '../../types';
import { TEAM_PROFILE_ID } from '../../shared/utils/formatters';
import { decodeJwtPayload } from '../../shared/utils/jwt';

export function isAnonymousTeamSession(session: AuthSession | null) {
  if (session?.user.perfilId !== TEAM_PROFILE_ID) return false;
  const claims = decodeJwtPayload(session.token);
  return Boolean(claims?.equipeId) && !claims?.equipeOperadorId;
}
