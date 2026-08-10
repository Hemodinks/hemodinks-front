import type { Hospital } from '../types';
import { get } from './api';

export function getHospitais(token: string) {
  return get<Hospital[]>('/api/hospitais/', token);
}
