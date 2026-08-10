import { normalizeLookupText } from '../../shared/utils/formatters';
import type {
  BillingBreakdownItem,
  BillingFilters,
  BillingRecord,
  BillingSummary,
  FilterBillingOptions,
} from './billingTypes';

function toNormalizedIncludes(haystack: string, needle: string) {
  const normalizedNeedle = normalizeLookupText(needle);
  return !normalizedNeedle || normalizeLookupText(haystack).includes(normalizedNeedle);
}

function getDateTimestamp(value?: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getCompetenciaMonthTimestamp(value: string, endOfMonth = false) {
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;

  const timestamp = endOfMonth
    ? new Date(year, month, 0, 23, 59, 59, 999).getTime()
    : new Date(year, month - 1, 1).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function summarizeBillingRecords(records: BillingRecord[]): BillingSummary {
  return records.reduce<BillingSummary>((summary, record) => ({
    totalRecords: summary.totalRecords + 1,
    totalGrossAmount: summary.totalGrossAmount + record.paymentAmount,
    totalGlosaAmount: summary.totalGlosaAmount + record.glosaAmount,
    totalNetAmount: summary.totalNetAmount + record.netAmount,
    paidCount: summary.paidCount + (record.status === 'paid' ? 1 : 0),
    pendingCount: summary.pendingCount + (record.status === 'pending' ? 1 : 0),
    missingAmountCount: summary.missingAmountCount + (record.status === 'missing' ? 1 : 0),
    particularCount: summary.particularCount + (record.regime === 'particular' ? 1 : 0),
    convenioCount: summary.convenioCount + (record.regime === 'convenio' ? 1 : 0),
    authorizationCount: summary.authorizationCount + (record.authorizationCode ? 1 : 0),
    opmeCount: summary.opmeCount + (record.hasOpme ? 1 : 0),
    attachmentCount: summary.attachmentCount + (record.filesCount > 0 ? 1 : 0),
    glosaCasesCount: summary.glosaCasesCount + (record.glosaAmount > 0 ? 1 : 0),
    recordsWithPendingItems: summary.recordsWithPendingItems + (record.pendingChecklistItems > 0 ? 1 : 0),
    nonNumericPaymentCount: summary.nonNumericPaymentCount + (!record.paymentHasNumericValue && record.paymentRaw ? 1 : 0),
    nonNumericGlosaCount: summary.nonNumericGlosaCount + (!record.glosaHasNumericValue && record.glosaRaw ? 1 : 0),
  }), {
    totalRecords: 0,
    totalGrossAmount: 0,
    totalGlosaAmount: 0,
    totalNetAmount: 0,
    paidCount: 0,
    pendingCount: 0,
    missingAmountCount: 0,
    particularCount: 0,
    convenioCount: 0,
    authorizationCount: 0,
    opmeCount: 0,
    attachmentCount: 0,
    glosaCasesCount: 0,
    recordsWithPendingItems: 0,
    nonNumericPaymentCount: 0,
    nonNumericGlosaCount: 0,
  });
}

function matchesCurrentMedicalUser(record: BillingRecord, options: FilterBillingOptions) {
  if (!options.restrictToMedicalUser) return true;
  if (options.currentMedicalUserId != null && record.doctorUserId === options.currentMedicalUserId) return true;
  const currentMedicalName = options.currentMedicalUserName?.trim() || '';
  return Boolean(currentMedicalName)
    && normalizeLookupText(record.doctorName) === normalizeLookupText(currentMedicalName);
}

export function filterBillingRecords(
  records: BillingRecord[],
  filters: BillingFilters,
  options: FilterBillingOptions = {},
) {
  const competenciaInicio = getCompetenciaMonthTimestamp(filters.competenciaInicio);
  const competenciaFinal = getCompetenciaMonthTimestamp(filters.competenciaFinal, true);

  return [...records]
    .filter((record) => matchesCurrentMedicalUser(record, options))
    .filter((record) => toNormalizedIncludes([
      record.patientName,
      record.doctorName,
      record.hospitalName,
      record.convenioName,
      record.authorizationCode,
      record.procedureSummary,
      record.procedureCodes.join(' '),
      record.paymentRaw,
      record.glosaRaw,
    ].join(' '), filters.search))
    .filter((record) => toNormalizedIncludes(record.doctorName, filters.medico))
    .filter((record) => toNormalizedIncludes(record.convenioName, filters.convenio))
    .filter((record) => toNormalizedIncludes(record.hospitalName, filters.hospital))
    .filter((record) => toNormalizedIncludes(record.procedureSummary, filters.procedimento))
    .filter((record) => filters.regime === 'all' || record.regime === filters.regime)
    .filter((record) => {
      if (filters.status === 'all') return true;
      if (filters.status === 'glosa') return record.glosaAmount > 0;
      return record.status === filters.status;
    })
    .filter((record) => !filters.onlyPendingItems || record.pendingChecklistItems > 0)
    .filter((record) => {
      const recordStart = getDateTimestamp(record.competenciaInicio);
      const recordEnd = getDateTimestamp(record.competenciaFinal);
      if (competenciaInicio != null && (recordEnd == null || recordEnd < competenciaInicio)) return false;
      if (competenciaFinal != null && (recordStart == null || recordStart > competenciaFinal)) return false;
      return true;
    })
    .sort((left, right) => {
      const dateComparison = (getDateTimestamp(right.surgeryDate) ?? 0) - (getDateTimestamp(left.surgeryDate) ?? 0);
      return dateComparison || left.patientName.localeCompare(right.patientName, 'pt-BR');
    });
}

function buildBreakdown(records: BillingRecord[], getLabel: (record: BillingRecord) => string) {
  const bucket = new Map<string, BillingBreakdownItem>();
  records.forEach((record) => {
    const label = getLabel(record);
    const current = bucket.get(label);
    if (current) {
      current.totalGrossAmount += record.paymentAmount;
      current.totalNetAmount += record.netAmount;
      current.totalGlosaAmount += record.glosaAmount;
      current.totalRecords += 1;
      current.pendingCount += record.pendingChecklistItems > 0 ? 1 : 0;
      return;
    }
    bucket.set(label, {
      label,
      totalGrossAmount: record.paymentAmount,
      totalNetAmount: record.netAmount,
      totalGlosaAmount: record.glosaAmount,
      totalRecords: 1,
      pendingCount: record.pendingChecklistItems > 0 ? 1 : 0,
    });
  });
  return [...bucket.values()].sort((left, right) => (
    right.totalGrossAmount - left.totalGrossAmount
    || left.label.localeCompare(right.label, 'pt-BR')
  ));
}

export function groupBillingByDoctor(records: BillingRecord[]) {
  return buildBreakdown(records, (record) => record.doctorName || 'Sem cirurgião');
}

export function groupBillingByConvenio(records: BillingRecord[]) {
  return buildBreakdown(
    records,
    (record) => record.regime === 'particular' ? 'Particular' : record.convenioName || 'Convênio não informado',
  );
}
