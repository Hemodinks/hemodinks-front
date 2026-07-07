import type { CbhpmFilters } from '../../appTypes';
import { normalizeCbhpmCodigo } from './patientUtils';

export const CBHPM_SEARCH_MIN_LENGTH = 3;
export const CBHPM_AUTO_SEARCH_DELAY_MS = 3000;
export type CbhpmAutoSearchFilters = Pick<CbhpmFilters, 'codigo' | 'procedimento'>;

export function normalizeCbhpmSearchText(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

export function getCbhpmAutoSearchFilters(filters: CbhpmFilters): CbhpmAutoSearchFilters {
  return {
    codigo: normalizeCbhpmCodigo(filters.codigo),
    procedimento: filters.procedimento,
  };
}

export function areCbhpmAutoSearchFiltersEqual(
  current: CbhpmAutoSearchFilters,
  debounced: CbhpmAutoSearchFilters,
) {
  return normalizeCbhpmCodigo(current.codigo) === normalizeCbhpmCodigo(debounced.codigo)
    && current.procedimento.trim() === debounced.procedimento.trim();
}

export function buildAppliedCbhpmFilters(
  filters: CbhpmFilters,
  autoSearchFilters = getCbhpmAutoSearchFilters(filters),
): CbhpmFilters {
  return {
    codigo: autoSearchFilters.codigo,
    procedimento: autoSearchFilters.procedimento,
    porte: filters.porte.trim().toUpperCase(),
  };
}

export function getCbhpmFilterValidationMessage(filters: CbhpmFilters) {
  const codigo = normalizeCbhpmCodigo(filters.codigo);
  const procedimento = normalizeCbhpmSearchText(filters.procedimento);
  const hasInvalidCodigo = codigo.length > 0 && codigo.length < CBHPM_SEARCH_MIN_LENGTH;
  const hasInvalidProcedimento = procedimento.length > 0 && procedimento.length < CBHPM_SEARCH_MIN_LENGTH;

  if (hasInvalidCodigo && hasInvalidProcedimento) {
    return 'Informe pelo menos 3 digitos no codigo e 3 caracteres na descricao para consultar.';
  }

  if (hasInvalidCodigo) {
    return 'Informe pelo menos 3 digitos no codigo para consultar.';
  }

  if (hasInvalidProcedimento) {
    return 'Informe pelo menos 3 caracteres na descricao para consultar.';
  }

  return '';
}

export function areCbhpmFiltersSearchable(filters: CbhpmFilters) {
  return !getCbhpmFilterValidationMessage(filters);
}

export function buildCbhpmQueryFilters(filters: CbhpmFilters): Partial<CbhpmFilters> {
  const codigo = normalizeCbhpmCodigo(filters.codigo);
  const procedimento = filters.procedimento.trim();
  const normalizedProcedimento = normalizeCbhpmSearchText(filters.procedimento);
  const porte = filters.porte.trim().toUpperCase();
  const queryFilters: Partial<CbhpmFilters> = {};

  if (codigo.length >= CBHPM_SEARCH_MIN_LENGTH) {
    queryFilters.codigo = codigo;
  }

  if (normalizedProcedimento.length >= CBHPM_SEARCH_MIN_LENGTH) {
    queryFilters.procedimento = procedimento;
  }

  if (porte) {
    queryFilters.porte = porte;
  }

  return queryFilters;
}
