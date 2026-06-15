import type { CbhpmFilters } from '../../appTypes';
import type { CbhpmGeral } from '../../types';
import { normalizeCbhpmCodigo } from './patientUtils';

export const CBHPM_CACHE_FETCH_PAGE_SIZE = 100;
export const CBHPM_SEARCH_MIN_LENGTH = 5;

export function normalizeCbhpmSearchText(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

export function isCbhpmCacheSearchReady(filters: CbhpmFilters) {
  const codigo = normalizeCbhpmCodigo(filters.codigo);
  const procedimento = normalizeCbhpmSearchText(filters.procedimento);

  return (!codigo && !procedimento)
    || codigo.length >= CBHPM_SEARCH_MIN_LENGTH
    || procedimento.length >= CBHPM_SEARCH_MIN_LENGTH;
}

export function filterCbhpmCachedItems(items: CbhpmGeral[], filters: CbhpmFilters) {
  if (!isCbhpmCacheSearchReady(filters)) {
    return [];
  }

  const codigo = normalizeCbhpmCodigo(filters.codigo);
  const procedimento = normalizeCbhpmSearchText(filters.procedimento);
  const porte = filters.porte.trim().toUpperCase();
  const shouldFilterCodigo = codigo.length >= CBHPM_SEARCH_MIN_LENGTH;
  const shouldFilterProcedimento = procedimento.length >= CBHPM_SEARCH_MIN_LENGTH;

  return items.filter((item) => {
    const itemCodigo = normalizeCbhpmCodigo(item.codigo);
    const itemDescricao = normalizeCbhpmSearchText(`${item.procedimento} ${item.grupo ?? ''} ${item.capitulo ?? ''}`);
    const itemPorte = item.porte?.trim().toUpperCase() ?? '';

    return (!shouldFilterCodigo || itemCodigo.includes(codigo))
      && (!shouldFilterProcedimento || itemDescricao.includes(procedimento))
      && (!porte || itemPorte === porte);
  });
}
