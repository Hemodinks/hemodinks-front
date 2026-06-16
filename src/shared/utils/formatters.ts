import type { Convenio, OpmeFornecedor, User } from '../../types';

export const DEFAULT_PASSWORD = 'Senha@123';
export const DEFAULT_PATIENT_BIRTH_DATE = '1900-01-01';
export const PAGE_SIZE = 10;
export const PATIENT_EXPORT_PAGE_SIZE = 100;
export const LOOKUP_PAGE_SIZE = 100;
export const CBHPM_PAGE_SIZE = 10;
export const MAX_NAME_LENGTH = 255;
export const MAX_DIAGNOSIS_LENGTH = 100;
export const MAX_TREATMENT_MEDICAL_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 255;
export const MAX_PHONE_LENGTH = 20;
export const MAX_CPF_LENGTH = 14;
export const MAX_CRM_LENGTH = 20;
export const MAX_PASSWORD_LENGTH = 500;
export const MAX_CURRENCY_DIGITS = 15;
export const MEDICAL_USERS_DATALIST_ID = 'hemodinks-medical-users-options';
export const CONVENIOS_DATALIST_ID = 'hemodinks-convenios-options';
export const OPME_FORNECEDORES_DATALIST_ID = 'hemodinks-opme-fornecedores-options';
export const MAX_PROFILE_PHOTO_BYTES = 1024 * 1024;
export const MAX_PATIENT_FILE_BYTES = 10 * 1024 * 1024;
export const MEDICAL_PROFILE_ID = 2;
export const CONTROLLER_PROFILE_ID = 4;
export const DEFAULT_PROFILE_ID = MEDICAL_PROFILE_ID;
export const API_ASSET_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export const PROFILE_OPTIONS = [
  { id: 1, nome: 'Administrador' },
  { id: 2, nome: 'Médicos' },
  { id: 4, nome: 'Controller' },
] as const;

export const BRAZIL_UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export const ALLOWED_PROFILE_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const ALLOWED_PATIENT_FILE_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const VALID_BRAZIL_AREA_CODES = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro inesperado.';
}

export function normalizeLookupText(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR');
}

export function findMedicalUserByName(users: User[], name: string) {
  const normalizedName = normalizeLookupText(name);
  return normalizedName
    ? users.find((user) => normalizeLookupText(user.nome) === normalizedName)
    : undefined;
}

export function findConvenioByDescription(convenios: Convenio[], descricao: string) {
  const normalizedDescricao = normalizeLookupText(descricao);
  return normalizedDescricao
    ? convenios.find((convenio) => normalizeLookupText(convenio.descricaoConvenio) === normalizedDescricao)
    : undefined;
}

export function findOpmeFornecedorByName(fornecedores: OpmeFornecedor[], fornecedor: string) {
  const normalizedFornecedor = normalizeLookupText(fornecedor);
  return normalizedFornecedor
    ? fornecedores.find((item) => normalizeLookupText(item.fornecedor) === normalizedFornecedor)
    : undefined;
}

export function isValidProfileId(perfilId: number) {
  return PROFILE_OPTIONS.some((profile) => profile.id === perfilId);
}

export function isMedicalProfileId(perfilId: number) {
  return perfilId === MEDICAL_PROFILE_ID;
}

export function getProfileName(perfilId: number) {
  return PROFILE_OPTIONS.find((profile) => profile.id === perfilId)?.nome ?? 'Médicos';
}

export function isMedicalProfileUser(user: User) {
  const profileName = (user.perfilNome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return user.perfilId === MEDICAL_PROFILE_ID || profileName.includes('medico');
}

export function getUserInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return 'US';
  }

  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function getBase64ImageContentType(value: string) {
  if (value.startsWith('/9j/')) {
    return 'image/jpeg';
  }

  if (value.startsWith('iVBORw0KGgo')) {
    return 'image/png';
  }

  if (value.startsWith('UklGR')) {
    return 'image/webp';
  }

  if (value.startsWith('R0lGOD')) {
    return 'image/gif';
  }

  return '';
}

export function resolveProfilePhotoSource(photo?: string | null) {
  const value = photo?.trim();

  if (!value) {
    return '';
  }

  if (/^(data:image\/|blob:|https?:\/\/)/i.test(value)) {
    return value;
  }

  if (value.startsWith('//')) {
    return `${window.location.protocol}${value}`;
  }

  const contentType = getBase64ImageContentType(value);
  if (contentType) {
    return `data:${contentType};base64,${value}`;
  }

  if (value.startsWith('/')) {
    return `${API_ASSET_BASE_URL}${value}`;
  }

  return `${API_ASSET_BASE_URL}/${value}`;
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function formatCpfInput(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function normalizeCpfForPayload(value: string) {
  return onlyDigits(value).slice(0, 11);
}

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const getDigit = (length: number) => {
    const sum = cpf
      .slice(0, length)
      .split('')
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return getDigit(9) === Number(cpf[9]) && getDigit(10) === Number(cpf[10]);
}

export function getLocalBrazilPhoneDigits(value: string) {
  const digits = onlyDigits(value);
  const withoutCountry = digits.startsWith('55') ? digits.slice(2) : digits;
  return withoutCountry.slice(0, 11);
}

export function formatPhoneInput(value: string) {
  const localDigits = getLocalBrazilPhoneDigits(value);

  if (!localDigits) {
    return '+55 ';
  }

  if (localDigits.length <= 2) {
    return `+55 (${localDigits}`;
  }

  const areaCode = localDigits.slice(0, 2);
  const phone = localDigits.slice(2);

  if (phone.length <= 5) {
    return `+55 (${areaCode}) ${phone}`;
  }

  return `+55 (${areaCode}) ${phone.slice(0, 5)}-${phone.slice(5)}`;
}

export function normalizePhoneForPayload(value: string) {
  return `+55${getLocalBrazilPhoneDigits(value)}`;
}

export function isValidBrazilMobilePhone(value: string) {
  const localDigits = getLocalBrazilPhoneDigits(value);
  const areaCode = localDigits.slice(0, 2);
  const phone = localDigits.slice(2);

  return localDigits.length === 11
    && VALID_BRAZIL_AREA_CODES.has(areaCode)
    && phone.startsWith('9')
    && !/^(\d)\1{10}$/.test(localDigits);
}

export function isValidEmail(value: string) {
  const email = value.trim();
  return email.length <= MAX_EMAIL_LENGTH
    && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

export function formatDateInput(value: string) {
  const digits = onlyDigits(value).slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function toDisplayDate(value: string) {
  if (!value) {
    return '';
  }

  if (value.includes('/')) {
    return formatDateInput(value);
  }

  const [year, month, day] = value.split('T')[0].split('-');

  if (!year || !month || !day) {
    return '';
  }

  return `${day}/${month}/${year}`;
}

export function toNotificationDate(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return toDisplayDate(value);
  }

  return new Intl.DateTimeFormat('pt-BR').format(date);
}

export function parseDisplayDate(value: string) {
  const [day, month, year] = value.split('/');
  return { day, month, year };
}

export function toDatePickerValue(value: string) {
  const { day, month, year } = parseDisplayDate(value);
  return year && month && day ? `${year}-${month}-${day}` : '';
}

export function fromDatePickerValue(value: string) {
  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return '';
  }

  return `${day}/${month}/${year}`;
}

export function getTodayPickerValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidBirthDate(value: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return false;
  }

  const { day: dayText, month: monthText, year: yearText } = parseDisplayDate(value);
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return year >= 1900
    && date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    && date <= today;
}

export function getPasswordStrength(password: string) {
  if (!password || password === DEFAULT_PASSWORD) {
    return { score: 0, label: 'Muito fraca' };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const labels = ['Muito fraca', 'Fraca', 'Regular', 'Boa', 'Forte', 'Muito forte'];
  return { score, label: labels[score] };
}

export function formatCurrency(value?: number | null) {
  return typeof value === 'number'
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '-';
}

export function formatCurrencyInput(value: string) {
  const digits = onlyDigits(value).slice(0, MAX_CURRENCY_DIGITS);

  if (!digits) {
    return '';
  }

  const padded = digits.padStart(3, '0');
  const cents = padded.slice(-2);
  const integerDigits = padded.slice(0, -2).replace(/^0+(?=\d)/, '');
  const integerPart = integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `R$ ${integerPart},${cents}`;
}
