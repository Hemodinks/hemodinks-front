import type { Paciente, PacienteFormData } from '../../../types';
import { formatPersonName, toDisplayDate } from '../../../shared/utils/formatters';
import { normalizeCbhpmCodigo } from '../patientUtils';

export type PatientExportColumn<T> = {
  header: string;
  getValue: (source: T) => string;
};

export type PatientExportRow = Record<string, string>;

export const pacienteExportColumns: readonly PatientExportColumn<Paciente>[] = [
  { header: 'Paciente', getValue: (paciente) => formatPersonName(paciente.nomePaciente) },
  { header: 'Data procedimento', getValue: (paciente) => toDisplayDate(paciente.data || '') || '-' },
  { header: 'Hospital', getValue: (paciente) => paciente.hospital || '-' },
  { header: 'Cirurgião', getValue: (paciente) => formatPersonName(paciente.medico) || '-' },
  { header: 'Médico auxiliar 1', getValue: (paciente) => formatPersonName(paciente.medicoAuxiliar1) || '-' },
  { header: 'Médico auxiliar 2', getValue: (paciente) => formatPersonName(paciente.medicoAuxiliar2) || '-' },
  { header: 'Convênio', getValue: (paciente) => paciente.convenio || '-' },
  { header: 'Fornecedor OPME', getValue: (paciente) => paciente.opmeFornecedor || '-' },
  { header: 'Código CBHPM', getValue: (paciente) => normalizeCbhpmCodigo(paciente.cbhpmCodigo) || '-' },
  { header: 'Porte CBHPM', getValue: (paciente) => paciente.cbhpmPorte || '-' },
  { header: 'Procedimento', getValue: (paciente) => paciente.procedimento || '-' },
  { header: 'Autorização', getValue: (paciente) => paciente.autorizacao || '-' },
  { header: 'Pagamento', getValue: (paciente) => paciente.pagamento || '-' },
  { header: 'Repasse/Glosa', getValue: (paciente) => paciente.repasseGlosa || '-' },
  { header: 'Status pago', getValue: (paciente) => (paciente.statusPago ? 'Pago' : 'Pendente') },
  { header: 'Ativo', getValue: (paciente) => (paciente.ativo ? 'Sim' : 'Não') },
  { header: 'Arquivos', getValue: (paciente) => String(paciente.arquivosCount ?? paciente.arquivos.length) },
];

export const pacienteFormExportColumns: readonly PatientExportColumn<PacienteFormData>[] = [
  { header: 'Data procedimento', getValue: (form) => toDisplayDate(form.data || '') || '-' },
  { header: 'Paciente', getValue: (form) => formatPersonName(form.nomePaciente) || '-' },
  { header: 'Diagnóstico', getValue: (form) => form.diagnostico || '-' },
  { header: 'Tratamento médico', getValue: (form) => form.tratamentoMedico || '-' },
  { header: 'CPF', getValue: (form) => form.cpf || '-' },
  { header: 'E-mail', getValue: (form) => form.email || '-' },
  { header: 'Telefone', getValue: (form) => form.telefone || '-' },
  { header: 'Data nascimento', getValue: (form) => toDisplayDate(form.dataNascimento || '') || '-' },
  { header: 'Hospital', getValue: (form) => form.hospital || '-' },
  { header: 'Cirurgião', getValue: (form) => formatPersonName(form.medico) || '-' },
  { header: 'Médico auxiliar 1', getValue: (form) => formatPersonName(form.medicoAuxiliar1) || '-' },
  { header: 'Médico auxiliar 2', getValue: (form) => formatPersonName(form.medicoAuxiliar2) || '-' },
  { header: 'Convênio', getValue: (form) => form.convenio || '-' },
  { header: 'Fornecedor OPME', getValue: (form) => form.opmeFornecedor || '-' },
  { header: 'Código CBHPM', getValue: (form) => normalizeCbhpmCodigo(form.cbhpmCodigo) || '-' },
  { header: 'Porte CBHPM', getValue: (form) => form.cbhpmPorte || '-' },
  { header: 'Procedimento', getValue: (form) => form.procedimento || '-' },
  { header: 'Autorização', getValue: (form) => form.autorizacao || '-' },
  { header: 'Pagamento', getValue: (form) => form.pagamento || '-' },
  { header: 'Repasse/Glosa', getValue: (form) => form.repasseGlosa || '-' },
  { header: 'Status pago', getValue: (form) => (form.statusPago ? 'Pago' : 'Pendente') },
  { header: 'Paciente ativo', getValue: (form) => (form.ativo ? 'Sim' : 'Não') },
  { header: 'Nova observação', getValue: (form) => form.novaObservacao || '-' },
];

function toExportRow<T>(source: T, columns: readonly PatientExportColumn<T>[]): PatientExportRow {
  return Object.fromEntries(columns.map((column) => [column.header, column.getValue(source)]));
}

export function getPacienteExportRows(items: Paciente[]) {
  return items.map((paciente) => toExportRow(paciente, pacienteExportColumns));
}

export function getPacienteFormExportRows(formData: PacienteFormData) {
  const baseRow = toExportRow(formData, pacienteFormExportColumns);
  const procedures = formData.procedimentos?.length
    ? formData.procedimentos
    : [{
        cbhpmCodigo: formData.cbhpmCodigo,
        cbhpmPorte: formData.cbhpmPorte,
        procedimento: formData.procedimento,
        valorReferencia: null,
      }];

  return procedures.map((procedimento) => ({
    ...baseRow,
    'Código CBHPM': normalizeCbhpmCodigo(procedimento.cbhpmCodigo) || '-',
    'Porte CBHPM': procedimento.cbhpmPorte || '-',
    Procedimento: procedimento.procedimento || '-',
  }));
}

function slugifyFilePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'empresa';
}

function getDatedFileName(prefix: string, extension: 'xlsx' | 'pdf', companyName: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}-${slugifyFilePart(companyName)}-${date}.${extension}`;
}

export function getPatientExportFileName(extension: 'xlsx' | 'pdf', companyName = 'Hemodinks') {
  return getDatedFileName('pacientes', extension, companyName);
}

export function getPatientFormExportFileName(extension: 'xlsx' | 'pdf', companyName = 'Hemodinks') {
  return getDatedFileName('cadastro-paciente', extension, companyName);
}
