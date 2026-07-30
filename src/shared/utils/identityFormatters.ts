import { DEFAULT_PASSWORD, MAX_EMAIL_LENGTH } from './formatterConstants';

const VALID_BRAZIL_AREA_CODES = new Set(
  '11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(
    ' ',
  ),
);

const LOWERCASE_PERSON_NAME_PARTICLES = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);

export function formatPersonName(value?: string | null) {
  const titleCasedName = (value?.trim() ?? '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .replace(
      /(^|[\s'-])(\p{L})/gu,
      (_, separator: string, letter: string) => `${separator}${letter.toLocaleUpperCase('pt-BR')}`,
    );

  return titleCasedName
    .split(' ')
    .map((part, index) =>
      index > 0 && LOWERCASE_PERSON_NAME_PARTICLES.has(part.toLocaleLowerCase('pt-BR'))
        ? part.toLocaleLowerCase('pt-BR')
        : part,
    )
    .join(' ');
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function formatCpfInput(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
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
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

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
  return (digits.startsWith('55') ? digits.slice(2) : digits).slice(0, 11);
}

export function formatPhoneInput(value: string) {
  const localDigits = getLocalBrazilPhoneDigits(value);
  if (!localDigits) return '+55 ';
  if (localDigits.length <= 2) return `+55 (${localDigits}`;

  const areaCode = localDigits.slice(0, 2);
  const phone = localDigits.slice(2);
  if (phone.length <= 5) return `+55 (${areaCode}) ${phone}`;
  return `+55 (${areaCode}) ${phone.slice(0, 5)}-${phone.slice(5)}`;
}

export function normalizePhoneForPayload(value: string) {
  return `+55${getLocalBrazilPhoneDigits(value)}`;
}

export function isValidBrazilMobilePhone(value: string) {
  const localDigits = getLocalBrazilPhoneDigits(value);
  const areaCode = localDigits.slice(0, 2);
  const phone = localDigits.slice(2);
  return (
    localDigits.length === 11 &&
    VALID_BRAZIL_AREA_CODES.has(areaCode) &&
    phone.startsWith('9') &&
    !/^(\d)\1{10}$/.test(localDigits)
  );
}

export function isValidEmail(value: string) {
  const email = value.trim();
  return email.length <= MAX_EMAIL_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

export function getPasswordStrength(password: string) {
  if (!password || password === DEFAULT_PASSWORD) return { score: 0, label: 'Muito fraca' };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return {
    score,
    label: ['Muito fraca', 'Fraca', 'Regular', 'Boa', 'Forte', 'Muito forte'][score],
  };
}
