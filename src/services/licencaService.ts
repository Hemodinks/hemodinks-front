import type { Licenca } from '../types';
import { get } from './api';

export function getCurrentLicenca(token: string) {
  return get<Licenca | null>('/api/licencas/current', token);
}
