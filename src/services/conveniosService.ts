import type { Convenio } from '../types';
import { get } from './api';

export function getConvenios(token: string) {
  return get<Convenio[]>('/api/convenios/', token);
}
