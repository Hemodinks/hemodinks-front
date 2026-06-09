import type { UserFormData } from '../../types';
import {
  DEFAULT_PROFILE_ID,
  formatCpfInput,
  formatPhoneInput,
  isMedicalProfileId,
  isValidBirthDate,
  isValidBrazilMobilePhone,
  isValidCpf,
  isValidEmail,
  isValidProfileId,
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
  dataNascimento: string;
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

  if (!isValidCpf(data.cpf)) {
    return 'Informe um CPF valido.';
  }

  if (!isValidBirthDate(data.dataNascimento)) {
    return 'Informe a data de nascimento no formato dd/mm/yyyy.';
  }

  if (!isValidProfileId(data.perfilId)) {
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

export function toUserPayload(data: UserFormData): UserFormData {
  return {
    nome: data.nome.trim(),
    email: data.email.trim(),
    telefone: normalizePhoneForPayload(data.telefone),
    cpf: normalizeCpfForPayload(data.cpf),
    crm: isMedicalProfileId(data.perfilId) ? data.crm.trim() : '',
    crmUf: isMedicalProfileId(data.perfilId) ? data.crmUf.trim().toUpperCase() : '',
    fotoPerfil: data.fotoPerfil || null,
    dataNascimento: toApiDate(data.dataNascimento),
    ativo: data.ativo,
    perfilId: data.perfilId,
  };
}
