import type { OpmeFornecedor } from '../types';
import { get } from './api';

export function getOpmeFornecedores(token: string) {
  return get<OpmeFornecedor[]>('/api/opme/', token);
}
