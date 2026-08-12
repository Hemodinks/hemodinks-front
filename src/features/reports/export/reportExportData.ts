import { formatCurrency } from '../../../shared/utils/formatters';
import type { ReportRecord } from '../reportTypes';

export type ReportColumn = {
  header: string;
  getValue: (record: ReportRecord) => string;
};

const numericValue = (record: ReportRecord, amount: number, raw: string, hasNumeric: boolean) => (
  hasNumeric ? formatCurrency(amount) : raw || '-'
);

export const reportColumns: readonly ReportColumn[] = [
  { header: 'Data atendimento', getValue: (record) => record.surgeryDateLabel },
  { header: 'Data do pagamento', getValue: (record) => record.paymentDateLabel },
  { header: 'Paciente', getValue: (record) => record.patientName },
  { header: 'Cirurgião', getValue: (record) => record.doctorName },
  { header: 'Auxiliares', getValue: (record) => record.assistantNames.join(', ') || '-' },
  { header: 'Equipes', getValue: (record) => record.teamNames.join(', ') || '-' },
  { header: 'Grupos médicos', getValue: (record) => record.medicalGroupNames.join(', ') || '-' },
  { header: 'Hospital', getValue: (record) => record.hospitalName },
  { header: 'Convênio', getValue: (record) => record.convenioName },
  { header: 'Regime', getValue: (record) => record.regime === 'convenio' ? 'Convênio' : 'Particular' },
  { header: 'Procedimentos', getValue: (record) => record.procedureSummary || '-' },
  { header: 'Códigos', getValue: (record) => record.procedureCodes.join(', ') || '-' },
  { header: 'Fornecedor OPME', getValue: (record) => record.opmeSupplier },
  { header: 'Autorização', getValue: (record) => record.authorizationCode || '-' },
  { header: 'Faturado', getValue: (record) => numericValue(record, record.paymentAmount, record.paymentRaw, record.paymentHasNumericValue) },
  { header: 'Glosa', getValue: (record) => numericValue(record, record.glosaAmount, record.glosaRaw, record.glosaHasNumericValue) },
  { header: 'Líquido', getValue: (record) => formatCurrency(record.netAmount) },
  { header: 'Status', getValue: (record) => record.statusLabel },
  { header: 'Pendências', getValue: (record) => String(record.pendingChecklistItems) },
  { header: 'Anexos', getValue: (record) => String(record.filesCount) },
];

export function getReportExportRows(records: ReportRecord[]) {
  return records.map((record) => Object.fromEntries(
    reportColumns.map((column) => [column.header, column.getValue(record)]),
  ));
}

export function getReportFileName(extension: 'pdf' | 'xlsx', companyName: string) {
  const company = companyName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'hemodinks';
  return `relatorios-${company}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}
