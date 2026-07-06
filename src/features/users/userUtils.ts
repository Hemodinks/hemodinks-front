import type { UserFormData, UserPayload } from '../../types';
import {
  DEFAULT_PROFILE_ID,
  formatCpfInput,
  formatPhoneInput,
  isAssignableUserProfileId,
  isMedicalProfileId,
  isValidBirthDate,
  isValidBrazilMobilePhone,
  isValidEmail,
  MAX_CRM_LENGTH,
  MAX_NAME_LENGTH,
  normalizeCpfForPayload,
  normalizePhoneForPayload,
  parseDisplayDate,
  toDisplayDate,
} from '../../shared/utils/formatters';

export const emptyUserForm: UserFormData = {
  nome: '',
  email: '',
  telefone: '+55 ',
  cpf: '',
  crm: '',
  crmUf: '',
  fotoPerfil: null,
  dataNascimento: '',
  ativo: true,
  perfilId: DEFAULT_PROFILE_ID,
};

function toApiDate(value: string) {
  const { day, month, year } = parseDisplayDate(value);
  return `${year}-${month}-${day}`;
}

export function getUserFormData(data: {
  nome: string;
  email: string;
  telefone: string;
  cpf?: string | null;
  crm?: string | null;
  crmUf?: string | null;
  fotoPerfil?: string | null;
  dataNascimento?: string | null;
  ativo: boolean;
  perfilId: number;
}): UserFormData {
  return {
    nome: data.nome,
    email: data.email,
    telefone: formatPhoneInput(data.telefone),
    cpf: formatCpfInput(data.cpf || ''),
    crm: data.crm || '',
    crmUf: data.crmUf || '',
    fotoPerfil: data.fotoPerfil ?? null,
    dataNascimento: toDisplayDate(data.dataNascimento),
    ativo: data.ativo,
    perfilId: data.perfilId || DEFAULT_PROFILE_ID,
  };
}

export function validateUserForm(data: UserFormData) {
  const birthDate = data.dataNascimento.trim();

  if (!data.nome.trim()) {
    return 'Informe o nome completo.';
  }

  if (data.nome.trim().length > MAX_NAME_LENGTH) {
    return `O nome deve ter no maximo ${MAX_NAME_LENGTH} caracteres.`;
  }

  if (!isValidEmail(data.email)) {
    return 'Informe um email valido.';
  }

  if (!isValidBrazilMobilePhone(data.telefone)) {
    return 'Informe um celular valido com DDD e 9 digitos.';
  }

  if (birthDate && !isValidBirthDate(birthDate)) {
    return 'Informe a data de nascimento no formato dd/mm/yyyy.';
  }

  if (!isAssignableUserProfileId(data.perfilId)) {
    return 'Selecione um perfil valido.';
  }

  if (isMedicalProfileId(data.perfilId)) {
    if (!data.crm.trim()) {
      return 'Informe o CRM do medico.';
    }

    if (data.crm.trim().length > MAX_CRM_LENGTH) {
      return `O CRM deve ter no maximo ${MAX_CRM_LENGTH} caracteres.`;
    }

    if (!data.crmUf) {
      return 'Selecione a UF do CRM.';
    }
  }

  return '';
}

export function toUserPayload(data: UserFormData): UserPayload {
  const cpf = normalizeCpfForPayload(data.cpf);
  const birthDate = data.dataNascimento.trim();

  return {
    nome: data.nome.trim(),
    email: data.email.trim(),
    telefone: normalizePhoneForPayload(data.telefone),
    cpf: cpf || null,
    crm: isMedicalProfileId(data.perfilId) ? data.crm.trim() : '',
    crmUf: isMedicalProfileId(data.perfilId) ? data.crmUf.trim().toUpperCase() : '',
    fotoPerfil: data.fotoPerfil || null,
    dataNascimento: birthDate ? toApiDate(birthDate) : null,
    ativo: data.ativo,
    perfilId: data.perfilId,
  };
}
