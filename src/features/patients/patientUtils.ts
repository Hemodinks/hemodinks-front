import type { Paciente, PacienteFormData, PacienteProcedimento } from '../../types';
import type { PacienteFilters } from '../../appTypes';
import {
  DEFAULT_PATIENT_BIRTH_DATE,
  formatCpfInput,
  formatCurrencyInput,
  formatPhoneInput,
  getLocalBrazilPhoneDigits,
  isValidBirthDate,
  normalizeCpfForPayload,
  normalizePhoneForPayload,
  parseDisplayDate,
  toDisplayDate,
} from '../../shared/utils/formatters';

export const emptyPacienteForm: PacienteFormData = {
  data: '',
  nomePaciente: '',
  diagnostico: '',
  tratamentoMedico: '',
  cpf: '',
  email: '',
  telefone: '',
  fotoPerfil: null,
  dataNascimento: '',
  hospitalId: null,
  hospital: '',
  medicoUserId: null,
  medico: '',
  medicoAuxiliar1UserId: null,
  medicoAuxiliar1: '',
  medicoAuxiliar2UserId: null,
  medicoAuxiliar2: '',
  convenioId: null,
  convenio: '',
  opmeFornecedorId: null,
  opmeFornecedor: '',
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
    diagnostico: paciente.diagnostico || '',
    tratamentoMedico: paciente.tratamentoMedico || '',
    cpf: formatCpfInput(paciente.cpf || ''),
    email: paciente.email,
    telefone: formatPhoneInput(paciente.telefone),
    fotoPerfil: paciente.fotoPerfil ?? null,
    dataNascimento: toDisplayDate(paciente.dataNascimento),
    hospitalId: paciente.hospitalId ?? null,
    hospital: paciente.hospital || '',
    medicoUserId: paciente.medicoUserId ?? null,
    medico: paciente.medico || '',
    medicoAuxiliar1UserId: paciente.medicoAuxiliar1UserId ?? null,
    medicoAuxiliar1: paciente.medicoAuxiliar1 || '',
    medicoAuxiliar2UserId: paciente.medicoAuxiliar2UserId ?? null,
    medicoAuxiliar2: paciente.medicoAuxiliar2 || '',
    convenioId: paciente.convenioId ?? null,
    convenio: paciente.convenio || '',
    opmeFornecedorId: paciente.opmeFornecedorId ?? null,
    opmeFornecedor: paciente.opmeFornecedor || '',
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

  if (!data.hospitalId && !data.hospital.trim()) {
    return 'Selecione um hospital.';
  }

  const duplicatedMedicalTeamError = getDuplicatedMedicalTeamError(data);
  if (duplicatedMedicalTeamError) {
    return duplicatedMedicalTeamError;
  }

  if (!getPacienteProcedimentosFromForm(data).length) {
    return 'Selecione ao menos um procedimento.';
  }

  return '';
}

export function getDuplicatedMedicalTeamError(data: PacienteFormData) {
  const medicalTeam = [
    { userId: data.medicoUserId, name: data.medico },
    { userId: data.medicoAuxiliar1UserId, name: data.medicoAuxiliar1 },
    { userId: data.medicoAuxiliar2UserId, name: data.medicoAuxiliar2 },
  ];
  const selectedUserIds = new Set<number>();
  const selectedNames = new Set<string>();

  for (const member of medicalTeam) {
    if (member.userId != null) {
      if (selectedUserIds.has(member.userId)) {
        return 'Cirurgiao e medicos auxiliares devem ser diferentes.';
      }

      selectedUserIds.add(member.userId);
      continue;
    }

    const normalizedName = member.name.trim().toLocaleLowerCase('pt-BR');
    if (!normalizedName) {
      continue;
    }

    if (selectedNames.has(normalizedName)) {
      return 'Cirurgiao e medicos auxiliares devem ser diferentes.';
    }

    selectedNames.add(normalizedName);
  }

  return '';
}

export function toPacientePayload(data: PacienteFormData): PacienteFormData {
  const cpf = normalizeCpfForPayload(data.cpf);
  const telefone = getLocalBrazilPhoneDigits(data.telefone)
    ? normalizePhoneForPayload(data.telefone)
    : '';
  const procedimentos = getPacienteProcedimentosFromForm(data);
  const firstProcedimento = procedimentos[0];

  return {
    data: data.data && isValidBirthDate(data.data) ? toApiDate(data.data) : null,
    nomePaciente: data.nomePaciente.trim(),
    diagnostico: data.diagnostico.trim(),
    tratamentoMedico: data.tratamentoMedico.trim(),
    cpf,
    email: data.email.trim(),
    telefone,
    fotoPerfil: data.fotoPerfil || null,
    dataNascimento: isValidBirthDate(data.dataNascimento) ? toApiDate(data.dataNascimento) : DEFAULT_PATIENT_BIRTH_DATE,
    hospitalId: data.hospitalId,
    hospital: data.hospital.trim(),
    medicoUserId: data.medicoUserId,
    medico: data.medico.trim(),
    medicoAuxiliar1UserId: data.medicoAuxiliar1UserId,
    medicoAuxiliar1: data.medicoAuxiliar1.trim(),
    medicoAuxiliar2UserId: data.medicoAuxiliar2UserId,
    medicoAuxiliar2: data.medicoAuxiliar2.trim(),
    convenioId: data.convenioId,
    convenio: data.convenio.trim(),
    opmeFornecedorId: data.opmeFornecedorId,
    opmeFornecedor: data.opmeFornecedor.trim(),
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
