import type { OpmeFornecedor } from '../shared/domain/patientContracts';
import { get } from './api';

export function getOpmeFornecedores(token: string) {
  return get<OpmeFornecedor[]>('/api/opme/', token);
}
