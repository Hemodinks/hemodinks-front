import type { Licenca } from '../features/auth/authTypes';
import { get } from './api';

export function getCurrentLicenca(token: string) {
  return get<Licenca | null>('/api/licencas/current', token);
}
