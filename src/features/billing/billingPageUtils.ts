import { getFaturamentosMedicos } from '../../services';
import { normalizeDisplayText, PATIENT_EXPORT_PAGE_SIZE } from '../../shared/utils/formatters';
import type { Paciente } from '../../types';
import type { BillingFilters, BillingRecord, BillingRegimeFilter, BillingStatusFilter } from './billingUtils';

export type BillingSortField = 'patient' | 'doctor' | 'status';

type BillingPageOptions = {
  currentPage: number;
  pageSize: number;
  sortBy: BillingSortField;
  sortDirection: 'asc' | 'desc';
};

export function getBillingPage(records: BillingRecord[], options: BillingPageOptions) {
  const sortedRecords = [...records].sort((left, right) => {
    const leftValue = options.sortBy === 'patient'
      ? left.patientName
      : options.sortBy === 'doctor'
        ? left.doctorName
        : left.statusLabel;
    const rightValue = options.sortBy === 'patient'
      ? right.patientName
      : options.sortBy === 'doctor'
        ? right.doctorName
        : right.statusLabel;
    const comparison = leftValue.localeCompare(rightValue, 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    });
    return options.sortDirection === 'asc' ? comparison : -comparison;
  });
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / options.pageSize));
  const visiblePage = Math.min(options.currentPage, totalPages);
  const visibleStart = sortedRecords.length ? ((visiblePage - 1) * options.pageSize) + 1 : 0;
  const visibleEnd = Math.min(visiblePage * options.pageSize, sortedRecords.length);
  const recordsForPage = sortedRecords.slice(visibleStart ? visibleStart - 1 : 0, visibleEnd);

  return { totalPages, visiblePage, visibleStart, visibleEnd, records: recordsForPage };
}

export const BILLING_STATUS_FILTER_OPTIONS: Array<{ label: string; value: BillingStatusFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Pagos', value: 'paid' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Com glosa', value: 'glosa' },
  { label: 'Sem valor informado', value: 'missing' },
];

export const BILLING_REGIME_FILTER_OPTIONS: Array<{ label: string; value: BillingRegimeFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Convênio', value: 'convenio' },
  { label: 'Particular', value: 'particular' },
];

function normalizeFilterOption(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function getFilterOptionLabel<TValue extends string>(options: Array<{ label: string; value: TValue }>, value: TValue) {
  return options.find((option) => option.value === value)?.label ?? options[0]?.label ?? '';
}

export function getFilterOptionValue<TValue extends string>(options: Array<{ label: string; value: TValue }>, label: string) {
  const normalizedLabel = normalizeFilterOption(label);

  return options.find((option) => normalizeFilterOption(option.label) === normalizedLabel)?.value;
}

export function parseBillingDetailId(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getUniqueSortedOptions(values: Array<string | null | undefined>) {
  return [...new Set(
    values
      .map((value) => normalizeDisplayText(value))
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }));
}

function normalizeBillingFilterText(value: string) {
  return value.trim();
}

export function areBillingFiltersEqual(left: BillingFilters, right: BillingFilters) {
  return normalizeBillingFilterText(left.search) === normalizeBillingFilterText(right.search)
    && normalizeBillingFilterText(left.medico) === normalizeBillingFilterText(right.medico)
    && normalizeBillingFilterText(left.convenio) === normalizeBillingFilterText(right.convenio)
    && normalizeBillingFilterText(left.hospital) === normalizeBillingFilterText(right.hospital)
    && normalizeBillingFilterText(left.procedimento) === normalizeBillingFilterText(right.procedimento)
    && left.competenciaInicio === right.competenciaInicio
    && left.competenciaFinal === right.competenciaFinal
    && left.status === right.status
    && left.regime === right.regime
    && left.onlyPendingItems === right.onlyPendingItems;
}

function toCompetenciaQueryValue(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return undefined;
  }

  const [year, month] = value.split('-');

  return `${month}/${year}`;
}

export async function loadBillingPatients(
  token: string,
  filters: {
    search: string;
    medico: string;
    convenio: string;
    procedimento: string;
    competenciaInicio: string;
    competenciaFinal: string;
  },
) {
  const items: Paciente[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await getFaturamentosMedicos(token, {
      page,
      pageSize: PATIENT_EXPORT_PAGE_SIZE,
      search: filters.search,
      medico: filters.medico || undefined,
      convenio: filters.convenio || undefined,
      procedimento: filters.procedimento || undefined,
      competenciaInicio: toCompetenciaQueryValue(filters.competenciaInicio),
      competenciaFinal: toCompetenciaQueryValue(filters.competenciaFinal),
      sortBy: 'recent',
      sortDirection: 'desc',
    });

    items.push(...response.items);
    totalPages = response.totalPages;
    page += 1;
  } while (page <= totalPages);

  return items;
}
