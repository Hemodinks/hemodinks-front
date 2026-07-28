import type { Hospital } from '../features/patients/patientTypes';
import { get } from './api';

export function getHospitais(token: string) {
  return get<Hospital[]>('/api/hospitais/', token);
}
