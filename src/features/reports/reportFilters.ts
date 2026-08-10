import { normalizeLookupText, parseDisplayDate } from '../../shared/utils/formatters';
import type { BillingRecord } from '../billing/billingTypes';
import type { MedicalGroup, Team } from '../../types';
import type { ReportFilters, ReportRecord } from './reportTypes';

export const emptyReportFilters: ReportFilters = {
  startDate: '',
  endDate: '',
  doctors: [],
  teams: [],
  medicalGroups: [],
  hospitals: [],
  convenios: [],
  procedures: [],
  opmeSuppliers: [],
  status: 'all',
  regime: 'all',
  onlyPendingItems: false,
};

function getUserKeys(id?: number | null, name?: string | null) {
  return [id == null ? '' : `id:${id}`, name ? `name:${normalizeLookupText(name)}` : ''].filter(Boolean);
}

function recordMedicalKeys(record: BillingRecord) {
  return new Set([
    ...getUserKeys(record.doctorUserId, record.doctorName),
    ...record.assistantNames.flatMap((name) => getUserKeys(null, name)),
  ]);
}

function memberMatches(keys: Set<string>, id: number, name: string) {
  return getUserKeys(id, name).some((key) => keys.has(key));
}

export function enrichReportRecords(records: BillingRecord[], groups: MedicalGroup[], teams: Team[]): ReportRecord[] {
  return records.map((record) => {
    const medicalKeys = recordMedicalKeys(record);
    return {
      ...record,
      medicalGroupNames: groups
        .filter((group) => group.membros.some((member) => memberMatches(medicalKeys, member.userId, member.nome)))
        .map((group) => group.nome),
      teamNames: teams
        .filter((team) => team.membros.some((member) => memberMatches(medicalKeys, member.userId, member.nome)))
        .map((team) => team.nome),
    };
  });
}

function dateToTimestamp(value: string, endOfDay = false) {
  if (!value) return null;
  const { day, month, year } = parseDisplayDate(value);
  if (!/^\d{2}$/.test(day) || !/^\d{2}$/.test(month) || !/^\d{4}$/.test(year)) return Number.NaN;
  const date = new Date(Number(year), Number(month) - 1, Number(day), endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)
    ? date.getTime()
    : Number.NaN;
}

function displayDateToIso(value: string) {
  if (!value) return '';
  const { day, month, year } = parseDisplayDate(value);
  const timestamp = dateToTimestamp(value);
  return Number.isFinite(timestamp) ? `${year}-${month}-${day}` : '';
}

export function validateReportDateRange(filters: ReportFilters) {
  const start = dateToTimestamp(filters.startDate);
  const end = dateToTimestamp(filters.endDate, true);
  if (Number.isNaN(start) || Number.isNaN(end)) return 'Informe datas válidas no formato dd/mm/aaaa.';
  if (start != null && end != null && start > end) return 'A data inicial não pode ser posterior à data final.';
  return '';
}

function selectedIncludes(values: string[], candidate: string) {
  return !values.length || values.some((value) => normalizeLookupText(value) === normalizeLookupText(candidate));
}

function selectedOverlaps(values: string[], candidates: string[]) {
  return !values.length || candidates.some((candidate) => selectedIncludes(values, candidate));
}

export function filterReportRecords(records: ReportRecord[], filters: ReportFilters) {
  const start = displayDateToIso(filters.startDate);
  const end = displayDateToIso(filters.endDate);
  return records.filter((record) => {
    const surgeryDate = record.surgeryDate?.split('T')[0] ?? '';
    if (start && (!surgeryDate || surgeryDate < start)) return false;
    if (end && (!surgeryDate || surgeryDate > end)) return false;
    return selectedIncludes(filters.doctors, record.doctorName)
      && selectedOverlaps(filters.teams, record.teamNames)
      && selectedOverlaps(filters.medicalGroups, record.medicalGroupNames)
      && selectedIncludes(filters.hospitals, record.hospitalName)
      && selectedIncludes(filters.convenios, record.convenioName)
      && selectedOverlaps(filters.procedures, record.procedures.map((item) => item.procedimento))
      && selectedIncludes(filters.opmeSuppliers, record.opmeSupplier)
      && (filters.regime === 'all' || record.regime === filters.regime)
      && (filters.status === 'all'
        || (filters.status === 'glosa' ? record.glosaAmount > 0 : record.status === filters.status))
      && (!filters.onlyPendingItems || record.pendingChecklistItems > 0);
  });
}

export function getReportOptions(records: ReportRecord[], groups: MedicalGroup[], teams: Team[]) {
  const unique = (values: string[]) => [...new Set(values.filter((value) => value && value !== 'Não informado'))]
    .sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }))
    .map((value) => ({ value, label: value }));
  return {
    doctors: unique(records.map((record) => record.doctorName)),
    teams: unique(teams.filter((team) => team.ativa).map((team) => team.nome)),
    medicalGroups: unique(groups.filter((group) => group.ativo).map((group) => group.nome)),
    hospitals: unique(records.map((record) => record.hospitalName)),
    convenios: unique(records.map((record) => record.convenioName)),
    procedures: unique(records.flatMap((record) => record.procedures.map((item) => item.procedimento))),
    opmeSuppliers: unique(records.filter((record) => record.hasOpme).map((record) => record.opmeSupplier)),
  };
}
