import type { Paciente } from '../../types';
import { getPacienteProcedimentosFromPaciente, normalizeCbhpmCodigo } from '../patients/patientUtils';
import {
  formatCurrency,
  normalizeLookupText,
  parseDisplayDate,
  toDisplayDate,
} from '../../shared/utils/formatters';

export type BillingChecklistStatus = 'ok' | 'warning' | 'missing';
export type BillingStatusFilter = 'all' | 'paid' | 'pending' | 'glosa' | 'missing';
export type BillingRegimeFilter = 'all' | 'convenio' | 'particular';
export type BillingRecordStatus = 'paid' | 'pending' | 'missing';

export type BillingChecklistItem = {
  label: string;
  value: string;
  status: BillingChecklistStatus;
  hint?: string;
};

export type BillingFilters = {
  search: string;
  medico: string;
  convenio: string;
  hospital: string;
  procedimento: string;
  periodStart: string;
  periodEnd: string;
  status: BillingStatusFilter;
  regime: BillingRegimeFilter;
  onlyPendingItems: boolean;
};

export type BillingRecord = {
  id: number;
  paciente: Paciente;
  patientName: string;
  doctorName: string;
  doctorUserId?: number | null;
  assistantNames: string[];
  hospitalName: string;
  convenioName: string;
  regime: 'convenio' | 'particular';
  surgeryDate: string | null;
  surgeryDateLabel: string;
  authorizationCode: string;
  paymentRaw: string;
  paymentAmount: number;
  paymentHasNumericValue: boolean;
  glosaRaw: string;
  glosaAmount: number;
  glosaHasNumericValue: boolean;
  netAmount: number;
  status: BillingRecordStatus;
  statusLabel: string;
  filesCount: number;
  hasOpme: boolean;
  opmeSupplier: string;
  procedureSummary: string;
  procedureCodes: string[];
  primaryProcedureLabel: string;
  procedures: ReturnType<typeof getPacienteProcedimentosFromPaciente>;
  surgicalPortes: string[];
  billingChecklist: BillingChecklistItem[];
  pendingChecklistItems: number;
};

export type BillingSummary = {
  totalRecords: number;
  totalGrossAmount: number;
  totalGlosaAmount: number;
  totalNetAmount: number;
  paidCount: number;
  pendingCount: number;
  missingAmountCount: number;
  particularCount: number;
  convenioCount: number;
  authorizationCount: number;
  opmeCount: number;
  attachmentCount: number;
  glosaCasesCount: number;
  recordsWithPendingItems: number;
  nonNumericPaymentCount: number;
  nonNumericGlosaCount: number;
};

export type BillingBreakdownItem = {
  label: string;
  totalGrossAmount: number;
  totalNetAmount: number;
  totalGlosaAmount: number;
  totalRecords: number;
  pendingCount: number;
};

type FilterBillingOptions = {
  restrictToMedicalUser?: boolean;
  currentMedicalUserId?: number | null;
  currentMedicalUserName?: string | null;
};

function parseCurrencyLikeValue(value?: string | null) {
  const raw = value?.trim() ?? '';

  if (!raw) {
    return { amount: 0, hasNumericValue: false };
  }

  const normalized = raw
    .replace(/\s/g, '')
    .replace(/^R\$/i, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');

  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') {
    return { amount: 0, hasNumericValue: false };
  }

  const amount = Number(normalized);

  return Number.isFinite(amount)
    ? { amount, hasNumericValue: true }
    : { amount: 0, hasNumericValue: false };
}

function getBillingStatus(paciente: Paciente, hasPaymentValue: boolean, hasGlosaValue: boolean): BillingRecordStatus {
  if (paciente.statusPago) {
    return 'paid';
  }

  if (hasPaymentValue || hasGlosaValue || Boolean(paciente.pagamento?.trim()) || Boolean(paciente.repasseGlosa?.trim())) {
    return 'pending';
  }

  return 'missing';
}

function getBillingStatusLabel(status: BillingRecordStatus) {
  if (status === 'paid') {
    return 'Pago';
  }

  if (status === 'pending') {
    return 'Pendente';
  }

  return 'Sem valor';
}

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

function getDisplayDateTimestamp(value: string, endOfDay = false) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return null;
  }

  const { day, month, year } = parseDisplayDate(value);

  if (!day || !month || !year) {
    return null;
  }

  const timestamp = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  ).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
}

function buildBillingChecklist(record: Omit<BillingRecord, 'billingChecklist' | 'pendingChecklistItems'>) {
  const checklist: BillingChecklistItem[] = [
    record.paymentHasNumericValue
      ? {
          label: 'Honorarios do cirurgiao',
          value: formatCurrency(record.paymentAmount),
          status: 'ok',
        }
      : record.paymentRaw
        ? {
            label: 'Honorarios do cirurgiao',
            value: record.paymentRaw,
            status: 'warning',
            hint: 'Campo de pagamento preenchido sem valor monetario estruturado.',
          }
        : {
            label: 'Honorarios do cirurgiao',
            value: 'Nao informado',
            status: 'missing',
          },
    record.assistantNames.length
      ? {
          label: 'Honorarios de auxiliares cirurgicos',
          value: record.assistantNames.join(', '),
          status: 'warning',
          hint: 'Equipe auxiliar cadastrada, mas sem valor separado por honorario.',
        }
      : {
          label: 'Honorarios de auxiliares cirurgicos',
          value: 'Nao informado',
          status: 'missing',
        },
    {
      label: 'Anestesista faturado separado',
      value: 'Nao informado no cadastro',
      status: 'missing',
    },
    record.primaryProcedureLabel
      ? {
          label: 'Procedimento principal',
          value: record.primaryProcedureLabel,
          status: 'ok',
        }
      : {
          label: 'Procedimento principal',
          value: 'Nao informado',
          status: 'missing',
        },
    record.procedures.length > 1
      ? {
          label: 'Procedimentos associados',
          value: `${record.procedures.length - 1} associado(s)`,
          status: 'ok',
        }
      : {
          label: 'Procedimentos associados',
          value: 'Somente procedimento principal',
          status: 'warning',
        },
    record.procedureCodes.length
      ? {
          label: 'Codigo TUSS/CBHPM/AMB',
          value: record.procedureCodes.join(', '),
          status: 'ok',
        }
      : {
          label: 'Codigo TUSS/CBHPM/AMB',
          value: 'Sem codigo informado',
          status: 'missing',
        },
    record.surgicalPortes.length
      ? {
          label: 'Porte cirurgico/anestesico',
          value: record.surgicalPortes.join(', '),
          status: 'ok',
        }
      : {
          label: 'Porte cirurgico/anestesico',
          value: 'Nao informado',
          status: 'missing',
        },
    record.regime === 'particular'
      ? {
          label: 'Guia de autorizacao do convenio',
          value: 'Nao se aplica ao faturamento particular',
          status: 'ok',
        }
      : record.authorizationCode
        ? {
            label: 'Guia de autorizacao do convenio',
            value: record.authorizationCode,
            status: 'ok',
          }
        : {
            label: 'Guia de autorizacao do convenio',
            value: 'Nao informada',
            status: 'missing',
          },
    record.regime === 'particular'
      ? {
          label: 'Guia de internacao ou SADT',
          value: 'Nao se aplica ao faturamento particular',
          status: 'ok',
        }
      : record.filesCount > 0
        ? {
            label: 'Guia de internacao ou SADT',
            value: `${record.filesCount} anexo(s) disponivel(is)`,
            status: 'warning',
            hint: 'Validar se a guia esta entre os arquivos anexados.',
          }
        : {
            label: 'Guia de internacao ou SADT',
            value: 'Sem guia anexada',
            status: 'missing',
          },
    record.hasOpme
      ? {
          label: 'OPME/materiais especiais',
          value: record.opmeSupplier,
          status: 'ok',
        }
      : {
          label: 'OPME/materiais especiais',
          value: 'Nao informado',
          status: 'warning',
        },
    record.filesCount > 0
      ? {
          label: 'Envio em padrao TISS/XML',
          value: `${record.filesCount} anexo(s) de suporte`,
          status: 'warning',
          hint: 'O cadastro nao marca explicitamente o envio TISS/XML.',
        }
      : {
          label: 'Envio em padrao TISS/XML',
          value: 'Sem evidencia no cadastro',
          status: 'missing',
        },
    record.glosaHasNumericValue && record.glosaAmount > 0
      ? {
          label: 'Glosas, recursos e conferencia',
          value: formatCurrency(record.glosaAmount),
          status: 'warning',
        }
      : record.status === 'paid'
        ? {
            label: 'Glosas, recursos e conferencia',
            value: 'Pagamento conferido',
            status: 'ok',
          }
        : {
            label: 'Glosas, recursos e conferencia',
            value: 'Aguardando conferencia',
            status: 'warning',
          },
    record.paymentHasNumericValue && record.hospitalName
      ? {
          label: 'Repasse medico via hospital/clinica',
          value: formatCurrency(record.netAmount),
          status: 'warning',
          hint: 'Liquido estimado a partir de pagamento menos glosa.',
        }
      : {
          label: 'Repasse medico via hospital/clinica',
          value: 'Nao separado no cadastro',
          status: 'missing',
        },
    record.regime === 'particular'
      ? record.filesCount > 0
        ? {
            label: 'Faturamento particular com suporte',
            value: `${record.filesCount} anexo(s) de suporte`,
            status: 'ok',
          }
        : {
            label: 'Faturamento particular com suporte',
            value: 'Sem recibo, nota ou contrato anexado',
            status: 'warning',
          }
      : {
          label: 'Faturamento particular com suporte',
          value: 'Realizado via convenio',
          status: 'ok',
        },
  ];

  return {
    checklist,
    pendingChecklistItems: checklist.filter((item) => item.status !== 'ok').length,
  };
}

export function createEmptyBillingFilters(defaultDoctor = ''): BillingFilters {
  return {
    search: '',
    medico: defaultDoctor,
    convenio: '',
    hospital: '',
    procedimento: '',
    periodStart: '',
    periodEnd: '',
    status: 'all',
    regime: 'all',
    onlyPendingItems: false,
  };
}

export function buildBillingRecords(pacientes: Paciente[]) {
  return pacientes.map((paciente) => {
    const procedures = getPacienteProcedimentosFromPaciente(paciente);
    const paymentInfo = parseCurrencyLikeValue(paciente.pagamento);
    const glosaInfo = parseCurrencyLikeValue(paciente.repasseGlosa);
    const doctorName = paciente.medico?.trim() || 'Nao informado';
    const assistantNames = [paciente.medicoAuxiliar1, paciente.medicoAuxiliar2]
      .map((value) => value?.trim() || '')
      .filter(Boolean);
    const procedureCodes = procedures
      .map((item) => normalizeCbhpmCodigo(item.cbhpmCodigo))
      .filter(Boolean);
    const primaryProcedure = procedures[0];
    const primaryProcedureLabel = primaryProcedure
      ? `${primaryProcedure.cbhpmCodigo ? `${primaryProcedure.cbhpmCodigo} - ` : ''}${primaryProcedure.procedimento}`
      : '';
    const status = getBillingStatus(paciente, paymentInfo.hasNumericValue, glosaInfo.hasNumericValue);
    const baseRecord: Omit<BillingRecord, 'billingChecklist' | 'pendingChecklistItems'> = {
      id: paciente.id,
      paciente,
      patientName: paciente.nomePaciente,
      doctorName,
      doctorUserId: paciente.medicoUserId ?? null,
      assistantNames,
      hospitalName: paciente.hospital?.trim() || 'Nao informado',
      convenioName: paciente.convenio?.trim() || 'Particular',
      regime: paciente.convenio?.trim() ? 'convenio' : 'particular',
      surgeryDate: paciente.data ?? null,
      surgeryDateLabel: paciente.data ? toDisplayDate(paciente.data) : '-',
      authorizationCode: paciente.autorizacao?.trim() || '',
      paymentRaw: paciente.pagamento?.trim() || '',
      paymentAmount: paymentInfo.amount,
      paymentHasNumericValue: paymentInfo.hasNumericValue,
      glosaRaw: paciente.repasseGlosa?.trim() || '',
      glosaAmount: glosaInfo.amount,
      glosaHasNumericValue: glosaInfo.hasNumericValue,
      netAmount: paymentInfo.amount - glosaInfo.amount,
      status,
      statusLabel: getBillingStatusLabel(status),
      filesCount: paciente.arquivosCount ?? paciente.arquivos.length,
      hasOpme: Boolean(paciente.opmeFornecedor?.trim()),
      opmeSupplier: paciente.opmeFornecedor?.trim() || 'Nao informado',
      procedureSummary: procedures.length
        ? procedures.map((item) => item.procedimento).join(', ')
        : 'Nao informado',
      procedureCodes,
      primaryProcedureLabel,
      procedures,
      surgicalPortes: procedures.map((item) => item.cbhpmPorte?.trim() || '').filter(Boolean),
    };
    const checklist = buildBillingChecklist(baseRecord);

    return {
      ...baseRecord,
      billingChecklist: checklist.checklist,
      pendingChecklistItems: checklist.pendingChecklistItems,
    };
  });
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
  if (!options.restrictToMedicalUser) {
    return true;
  }

  if (options.currentMedicalUserId != null && record.doctorUserId === options.currentMedicalUserId) {
    return true;
  }

  const currentMedicalName = options.currentMedicalUserName?.trim() || '';

  if (!currentMedicalName) {
    return false;
  }

  return normalizeLookupText(record.doctorName) === normalizeLookupText(currentMedicalName);
}

export function filterBillingRecords(records: BillingRecord[], filters: BillingFilters, options: FilterBillingOptions = {}) {
  const periodStart = getDisplayDateTimestamp(filters.periodStart);
  const periodEnd = getDisplayDateTimestamp(filters.periodEnd, true);

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
      const surgeryTimestamp = getDateTimestamp(record.surgeryDate);

      if (periodStart != null && (surgeryTimestamp == null || surgeryTimestamp < periodStart)) {
        return false;
      }

      if (periodEnd != null && (surgeryTimestamp == null || surgeryTimestamp > periodEnd)) {
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

  return [...bucket.values()].sort((left, right) => {
    if (right.totalGrossAmount !== left.totalGrossAmount) {
      return right.totalGrossAmount - left.totalGrossAmount;
    }

    return left.label.localeCompare(right.label, 'pt-BR');
  });
}

export function groupBillingByDoctor(records: BillingRecord[]) {
  return buildBreakdown(records, (record) => record.doctorName || 'Sem cirurgiao');
}

export function groupBillingByConvenio(records: BillingRecord[]) {
  return buildBreakdown(records, (record) => record.regime === 'particular' ? 'Particular' : record.convenioName || 'Convenio nao informado');
}
