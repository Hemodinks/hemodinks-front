import type { Paciente, PacienteListQuery } from '../shared/domain/patientContracts';
import type { PagedResult } from '../shared/domain/apiTypes';
import { get } from './api';
import { buildListQueryParams } from './queryParams';

export function getFaturamentosMedicos(token: string, query?: PacienteListQuery) {
  return get<PagedResult<Paciente>>('/api/faturamentos-medicos/', token, {
    params: buildListQueryParams(query),
  });
}
