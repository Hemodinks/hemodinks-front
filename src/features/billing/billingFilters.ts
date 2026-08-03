import { normalizeLookupText } from '../../shared/utils/formatters';
import type { BillingFilters, BillingRecord, FilterBillingOptions } from './billingModels';

function toNormalizedIncludes(haystack: string, needle: string) {
  const normalizedNeedle = normalizeLookupText(needle);

  if (!normalizedNeedle) {
    return true;
  }

  return normalizeLookupText(haystack).includes(normalizedNeedle);
}

function getDateTimestamp(value?: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getCompetenciaMonthTimestamp(value: string, endOfMonth = false) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month] = value.split('-').map(Number);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  const timestamp = endOfMonth
    ? new Date(year, month, 0, 23, 59, 59, 999).getTime()
    : new Date(year, month - 1, 1).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
}

export function createEmptyBillingFilters(
  defaultDoctor = '',
  defaultCompetencia = '',
): BillingFilters {
  return {
    search: '',
    medico: defaultDoctor,
    convenio: '',
    hospital: '',
    procedimento: '',
    competenciaInicio: defaultCompetencia,
    competenciaFinal: defaultCompetencia,
    status: 'all',
    regime: 'all',
    onlyPendingItems: false,
  };
}

function matchesCurrentMedicalUser(record: BillingRecord, options: FilterBillingOptions) {
  if (!options.restrictToMedicalUser) {
    return true;
  }

  if (
    options.currentMedicalUserId != null &&
    record.doctorUserId === options.currentMedicalUserId
  ) {
    return true;
  }

  const currentMedicalName = options.currentMedicalUserName?.trim() || '';

  if (!currentMedicalName) {
    return false;
  }

  return normalizeLookupText(record.doctorName) === normalizeLookupText(currentMedicalName);
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
    .filter((record) => {
      const searchableFields = [
        record.patientName,
        record.doctorName,
        record.hospitalName,
        record.convenioName,
        record.authorizationCode,
        record.procedureSummary,
        record.procedureCodes.join(' '),
        record.paymentRaw,
        record.glosaRaw,
      ].join(' ');

      return toNormalizedIncludes(searchableFields, filters.search);
    })
    .filter((record) => toNormalizedIncludes(record.doctorName, filters.medico))
    .filter((record) => toNormalizedIncludes(record.convenioName, filters.convenio))
    .filter((record) => toNormalizedIncludes(record.hospitalName, filters.hospital))
    .filter((record) => toNormalizedIncludes(record.procedureSummary, filters.procedimento))
    .filter((record) => {
      if (filters.regime === 'all') {
        return true;
      }

      return record.regime === filters.regime;
    })
    .filter((record) => {
      if (filters.status === 'all') {
        return true;
      }

      if (filters.status === 'paid') {
        return record.status === 'paid';
      }

      if (filters.status === 'pending') {
        return record.status === 'pending';
      }

      if (filters.status === 'glosa') {
        return record.glosaAmount > 0;
      }

      return record.status === 'missing';
    })
    .filter((record) => {
      if (!filters.onlyPendingItems) {
        return true;
      }

      return record.pendingChecklistItems > 0;
    })
    .filter((record) => {
      const competenciaRecordStart = getDateTimestamp(record.competenciaInicio);
      const competenciaRecordEnd = getDateTimestamp(record.competenciaFinal);

      if (
        competenciaInicio != null &&
        (competenciaRecordEnd == null || competenciaRecordEnd < competenciaInicio)
      ) {
        return false;
      }

      if (
        competenciaFinal != null &&
        (competenciaRecordStart == null || competenciaRecordStart > competenciaFinal)
      ) {
        return false;
      }

      return true;
    })
    .sort((left, right) => {
      const rightTimestamp = getDateTimestamp(right.surgeryDate) ?? 0;
      const leftTimestamp = getDateTimestamp(left.surgeryDate) ?? 0;

      if (rightTimestamp !== leftTimestamp) {
        return rightTimestamp - leftTimestamp;
      }

      return left.patientName.localeCompare(right.patientName, 'pt-BR');
    });
}
