import type { CbhpmListQuery, ListQuery, PacienteListQuery } from '../types';

export function buildListQueryParams(query?: ListQuery | PacienteListQuery | CbhpmListQuery) {
  const params = new URLSearchParams();

  if (query?.page) {
    params.set('page', String(query.page));
  }

  if (query?.pageSize) {
    params.set('pageSize', String(query.pageSize));
  }

  if (query?.search?.trim()) {
    params.set('search', query.search.trim());
  }

  if (query && 'profileId' in query && query.profileId) {
    params.set('profileId', String(query.profileId));
  }

  if (query && 'medico' in query && query.medico?.trim()) {
    params.set('medico', query.medico.trim());
  }

  if (query && 'convenio' in query && query.convenio?.trim()) {
    params.set('convenio', query.convenio.trim());
  }

  if (query && 'codigo' in query && query.codigo?.trim()) {
    params.set('codigo', query.codigo.trim());
  }

  if (query && 'procedimento' in query && query.procedimento?.trim()) {
    params.set('procedimento', query.procedimento.trim());
  }

  if (query && 'porte' in query && query.porte?.trim()) {
    params.set('porte', query.porte.trim());
  }

  if (query && 'sortBy' in query && query.sortBy?.trim()) {
    params.set('sortBy', query.sortBy.trim());
  }

  if (query && 'sortDirection' in query && query.sortDirection) {
    params.set('sortDirection', query.sortDirection);
  }

  return params.toString() ? params : undefined;
}
