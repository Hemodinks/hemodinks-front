import type { Paciente, PacienteFormData, PacienteProcedimento } from '../../types';
import type { PacienteFilters } from '../../appTypes';
import {
  DEFAULT_PATIENT_BIRTH_DATE,
  formatCpfInput,
  formatCurrencyInput,
  formatPhoneInput,
  isValidBirthDate,
  isValidBrazilMobilePhone,
  isValidCpf,
  normalizeCpfForPayload,
  normalizePhoneForPayload,
  parseDisplayDate,
  toDisplayDate,
} from '../../shared/utils/formatters';

export const emptyPacienteForm: PacienteFormData = {
  data: '',
  nomePaciente: '',
  cpf: '',
  email: '',
  telefone: '+55 ',
  fotoPerfil: null,
  dataNascimento: '',
  hospitalId: null,
  hospital: '',
  medicoUserId: null,
  medico: '',
  convenioId: null,
  convenio: '',
  cbhpmCodigo: '',
  cbhpmPorte: '',
  procedimento: '',
  procedimentos: [],
  autorizacao: '',
  pagamento: '',
  repasseGlosa: '',
  statusPago: false,
  ativo: true,
};

export const emptyPacienteFilters: PacienteFilters = {
  medico: '',
  convenio: '',
  procedimento: '',
};

export function getPacienteFilterQuery(filters: PacienteFilters, enabled: boolean) {
  if (!enabled) {
    return {};
  }

  return {
    ...(filters.medico.trim() ? { medico: filters.medico.trim() } : {}),
    ...(filters.convenio.trim() ? { convenio: filters.convenio.trim() } : {}),
    ...(filters.procedimento.trim() ? { procedimento: filters.procedimento.trim() } : {}),
  };
}

export function normalizeCbhpmCodigo(value?: string | null) {
  return value?.replace(/\D/g, '') ?? '';
}

function toApiDate(value: string) {
  const { day, month, year } = parseDisplayDate(value);
  return `${year}-${month}-${day}`;
}

export function normalizePacienteProcedimentos(procedimentos: PacienteProcedimento[]) {
  const seen = new Set<string>();

  return procedimentos
    .map((item) => ({
      cbhpmCodigo: normalizeCbhpmCodigo(item.cbhpmCodigo) || null,
      cbhpmPorte: item.cbhpmPorte?.trim() || null,
      procedimento: item.procedimento.trim(),
      valorReferencia: item.valorReferencia ?? null,
    }))
    .filter((item) => item.procedimento)
    .filter((item) => {
      const key = item.cbhpmCodigo ? `codigo:${item.cbhpmCodigo}` : `livre:${item.procedimento}:${item.cbhpmPorte || ''}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

export function getPacienteProcedimentosFromForm(data: PacienteFormData) {
  const procedimentos = normalizePacienteProcedimentos(data.procedimentos);
  if (procedimentos.length) {
    return procedimentos;
  }

  return normalizePacienteProcedimentos([
    {
      cbhpmCodigo: data.cbhpmCodigo,
      cbhpmPorte: data.cbhpmPorte,
      procedimento: data.procedimento,
    },
  ]);
}

export function getPacienteProcedimentosFromPaciente(paciente: Paciente) {
  return normalizePacienteProcedimentos(
    paciente.procedimentos?.length
      ? paciente.procedimentos
      : [
          {
            cbhpmCodigo: paciente.cbhpmCodigo,
            cbhpmPorte: paciente.cbhpmPorte,
            procedimento: paciente.procedimento || '',
          },
        ],
  );
}

export function withPrimaryProcedimento(data: PacienteFormData): PacienteFormData {
  const procedimentos = getPacienteProcedimentosFromForm(data);
  const first = procedimentos[0];

  return {
    ...data,
    procedimentos,
    cbhpmCodigo: first?.cbhpmCodigo || '',
    cbhpmPorte: first?.cbhpmPorte || '',
    procedimento: first?.procedimento || '',
  };
}

export function getPacienteFormData(paciente: Paciente): PacienteFormData {
  return withPrimaryProcedimento({
    data: toDisplayDate(paciente.data || ''),
    nomePaciente: paciente.nomePaciente,
    cpf: formatCpfInput(paciente.cpf || ''),
    email: paciente.email,
    telefone: formatPhoneInput(paciente.telefone),
    fotoPerfil: paciente.fotoPerfil ?? null,
    dataNascimento: toDisplayDate(paciente.dataNascimento),
    hospitalId: paciente.hospitalId ?? null,
    hospital: paciente.hospital || '',
    medicoUserId: paciente.medicoUserId ?? null,
    medico: paciente.medico || '',
    convenioId: paciente.convenioId ?? null,
    convenio: paciente.convenio || '',
    cbhpmCodigo: normalizeCbhpmCodigo(paciente.cbhpmCodigo),
    cbhpmPorte: paciente.cbhpmPorte || '',
    procedimento: paciente.procedimento || '',
    procedimentos: getPacienteProcedimentosFromPaciente(paciente),
    autorizacao: paciente.autorizacao || '',
    pagamento: formatCurrencyInput(paciente.pagamento || ''),
    repasseGlosa: formatCurrencyInput(paciente.repasseGlosa || ''),
    statusPago: paciente.statusPago,
    ativo: paciente.ativo,
  });
}

export function validatePacienteForm(data: PacienteFormData) {
  if (!data.nomePaciente.trim()) {
    return 'Informe o nome do paciente.';
  }

  if (!isValidCpf(data.cpf)) {
    return 'Informe um CPF valido.';
  }

  if (!isValidBrazilMobilePhone(data.telefone)) {
    return 'Informe um celular valido com DDD e 9 digitos.';
  }

  if (!data.hospitalId && !data.hospital.trim()) {
    return 'Selecione um hospital.';
  }

  if (!getPacienteProcedimentosFromForm(data).length) {
    return 'Selecione ao menos um procedimento.';
  }

  return '';
}

export function toPacientePayload(data: PacienteFormData): PacienteFormData {
  const cpf = normalizeCpfForPayload(data.cpf);
  const generatedEmail = `paciente-${cpf}@hemodinks.local`;
  const procedimentos = getPacienteProcedimentosFromForm(data);
  const firstProcedimento = procedimentos[0];

  return {
    data: data.data && isValidBirthDate(data.data) ? toApiDate(data.data) : null,
    nomePaciente: data.nomePaciente.trim(),
    cpf,
    email: data.email.trim() || generatedEmail,
    telefone: normalizePhoneForPayload(data.telefone),
    fotoPerfil: data.fotoPerfil || null,
    dataNascimento: isValidBirthDate(data.dataNascimento) ? toApiDate(data.dataNascimento) : DEFAULT_PATIENT_BIRTH_DATE,
    hospitalId: data.hospitalId,
    hospital: data.hospital.trim(),
    medicoUserId: data.medicoUserId,
    medico: data.medico.trim(),
    convenioId: data.convenioId,
    convenio: data.convenio.trim(),
    cbhpmCodigo: firstProcedimento?.cbhpmCodigo || '',
    cbhpmPorte: firstProcedimento?.cbhpmPorte || '',
    procedimento: firstProcedimento?.procedimento || '',
    procedimentos,
    autorizacao: data.autorizacao.trim(),
    pagamento: data.pagamento.trim(),
    repasseGlosa: data.repasseGlosa.trim(),
    statusPago: data.statusPago,
    ativo: data.ativo,
  };
}
