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

  if (query && 'medicoUserIds' in query && query.medicoUserIds?.trim()) {
    params.set('medicoUserIds', query.medicoUserIds.trim());
  }

  if (query && 'medico' in query && query.medico?.trim()) {
    params.set('medico', query.medico.trim());
  }

  if (query && 'convenioIds' in query && query.convenioIds?.trim()) {
    params.set('convenioIds', query.convenioIds.trim());
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

  if (query && 'dataInicio' in query && query.dataInicio?.trim()) {
    params.set('dataInicio', query.dataInicio.trim());
  }

  if (query && 'dataFinal' in query && query.dataFinal?.trim()) {
    params.set('dataFinal', query.dataFinal.trim());
  }

  if (query && 'dataSolicitacaoInicio' in query && query.dataSolicitacaoInicio?.trim()) {
    params.set('dataSolicitacaoInicio', query.dataSolicitacaoInicio.trim());
  }

  if (query && 'dataSolicitacaoFinal' in query && query.dataSolicitacaoFinal?.trim()) {
    params.set('dataSolicitacaoFinal', query.dataSolicitacaoFinal.trim());
  }

  if (query && 'competenciaInicio' in query && query.competenciaInicio?.trim()) {
    params.set('competenciaInicio', query.competenciaInicio.trim());
  }

  if (query && 'competenciaFinal' in query && query.competenciaFinal?.trim()) {
    params.set('competenciaFinal', query.competenciaFinal.trim());
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
