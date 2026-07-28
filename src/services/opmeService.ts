import type { OpmeFornecedor } from '../features/patients/patientTypes';
import { get } from './api';

export function getOpmeFornecedores(token: string) {
  return get<OpmeFornecedor[]>('/api/opme/', token);
}
