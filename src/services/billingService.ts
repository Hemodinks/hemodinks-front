import type { Paciente, PacienteListQuery, PagedResult } from '../types';
import { get } from './api';
import { buildListQueryParams } from './queryParams';

export function getFaturamentosMedicos(token: string, query?: PacienteListQuery) {
  return get<PagedResult<Paciente>>('/api/faturamentos-medicos/', token, {
    params: buildListQueryParams(query),
  });
}
