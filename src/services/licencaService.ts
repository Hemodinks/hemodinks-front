import type { SessionLicense as Licenca } from '../shared/domain/sessionTypes';
import { get } from './api';

export function getCurrentLicenca(token: string) {
  return get<Licenca | null>('/api/licencas/current', token);
}
