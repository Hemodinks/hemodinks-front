import type {
  Convenio,
  Hospital,
  MedicalUserOption,
  OpmeFornecedor,
  User,
} from "../../types";
import {
  API_ASSET_BASE_URL,
  DEFAULT_PROFILE_ID,
  MAX_CURRENCY_DIGITS,
  MAX_EMAIL_LENGTH,
  MEDICAL_PROFILE_ID,
  PROFILE_OPTIONS,
  USER_PROFILE_OPTIONS,
  VALID_BRAZIL_AREA_CODES,
} from './formatterConstants';

export * from './formatterConstants';

export {
  formatDateInput,
  fromDatePickerValue,
  getTodayPickerValue,
  isValidBirthDate,
  parseDisplayDate,
  toDatePickerValue,
  toDisplayDate,
  toNotificationDate,
} from './dateFormatters';

export function getErrorMessage(error: unknown) {
  if (error instanceof Error && /\b403\b|forbidden/i.test(error.message)) {
    return "Operação não permitida.";
  }

  return error instanceof Error ? error.message : "Erro inesperado.";
}

export function normalizeLookupText(value: string) {
  return normalizeDisplayText(value).trim().toLocaleLowerCase("pt-BR");
}

const DISPLAY_TEXT_FIXES = new Map<string, string>([
  ["Bradesco Sa\u00c3\u00bade", "Bradesco Saúde"],
  ["Bradesco Sa\uFFFDde", "Bradesco Saúde"],
  ["Cemig Sa\u00c3\u00bade", "Cemig Saúde"],
  ["Cemig Sa\uFFFDde", "Cemig Saúde"],
  ["Sul Am\u00c3\u00a9rica", "Sul América"],
  ["Sul Am\uFFFDrica", "Sul América"],
  [
    "Unimed Uberl\u00c3\u00a2ndia - Plano  Unimed Interc\u00c3\u00a2mbio",
    "Unimed Uberlândia - Plano  Unimed Intercâmbio",
  ],
  [
    "Unimed Uberl\uFFFDndia - Plano  Unimed Interc\uFFFDmbio",
    "Unimed Uberlândia - Plano  Unimed Intercâmbio",
  ],
]);

export function normalizeDisplayText(value?: string | null) {
  const trimmedValue = value?.trim() ?? "";

  return DISPLAY_TEXT_FIXES.get(trimmedValue) ?? trimmedValue;
}

const LOWERCASE_PERSON_NAME_PARTICLES = new Set([
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
]);

export function formatPersonName(value?: string | null) {
  const titleCasedName = normalizeDisplayText(value)
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .replace(
      /(^|[\s'-])(\p{L})/gu,
      (_, separator: string, letter: string) =>
        `${separator}${letter.toLocaleUpperCase("pt-BR")}`,
    );

  return titleCasedName
    .split(" ")
    .map((part, index) =>
      index > 0 &&
      LOWERCASE_PERSON_NAME_PARTICLES.has(part.toLocaleLowerCase("pt-BR"))
        ? part.toLocaleLowerCase("pt-BR")
        : part,
    )
    .join(" ");
}

export function findMedicalUserByName(
  users: Array<User | MedicalUserOption>,
  name: string,
) {
  const normalizedName = normalizeLookupText(name);
  return normalizedName
    ? users.find((user) => normalizeLookupText(user.nome) === normalizedName)
    : undefined;
}

export function findConvenioByDescription(
  convenios: Convenio[],
  descricao: string,
) {
  const normalizedDescricao = normalizeLookupText(descricao);
  return normalizedDescricao
    ? convenios.find(
        (convenio) =>
          normalizeLookupText(convenio.descricaoConvenio) ===
          normalizedDescricao,
      )
    : undefined;
}

export function findHospitalByName(hospitais: Hospital[], nome: string) {
  const normalizedNome = normalizeLookupText(nome);
  return normalizedNome
    ? hospitais.find(
        (hospital) => normalizeLookupText(hospital.nome) === normalizedNome,
      )
    : undefined;
}

export function findOpmeFornecedorByName(
  fornecedores: OpmeFornecedor[],
  fornecedor: string,
) {
  const normalizedFornecedor = normalizeLookupText(fornecedor);
  return normalizedFornecedor
    ? fornecedores.find(
        (item) => normalizeLookupText(item.fornecedor) === normalizedFornecedor,
      )
    : undefined;
}

export function isValidProfileId(perfilId: number) {
  return PROFILE_OPTIONS.some((profile) => profile.id === perfilId);
}

export function isAssignableUserProfileId(perfilId: number) {
  return USER_PROFILE_OPTIONS.some((profile) => profile.id === perfilId);
}

export function isMedicalProfileId(perfilId: number) {
  return perfilId === MEDICAL_PROFILE_ID;
}

export function getProfileName(perfilId: number) {
  return (
    PROFILE_OPTIONS.find((profile) => profile.id === perfilId)?.nome ??
    "Médicos"
  );
}

export function formatProfileName(
  perfilId?: number | null,
  perfilNome?: string | null,
) {
  const profile = PROFILE_OPTIONS.find((item) => item.id === perfilId);

  if (profile) {
    return profile.nome;
  }

  const profileName = perfilNome?.trim() ?? "";

  if (!profileName) {
    return getProfileName(DEFAULT_PROFILE_ID);
  }

  const asciiProfileName = profileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    asciiProfileName.includes("medico") ||
    /^m.{1,2}dicos$/i.test(profileName)
  ) {
    return getProfileName(MEDICAL_PROFILE_ID);
  }

  return profileName;
}

export function isMedicalProfileUser(user: User) {
  const profileName = (user.perfilNome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return user.perfilId === MEDICAL_PROFILE_ID || profileName.includes("medico");
}

export function getUserInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return "US";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getBase64ImageContentType(value: string) {
  if (value.startsWith("/9j/")) {
    return "image/jpeg";
  }

  if (value.startsWith("iVBORw0KGgo")) {
    return "image/png";
  }

  if (value.startsWith("UklGR")) {
    return "image/webp";
  }

  if (value.startsWith("R0lGOD")) {
    return "image/gif";
  }

  return "";
}

export function resolveProfilePhotoSource(photo?: string | null) {
  const value = photo?.trim();

  if (!value) {
    return "";
  }

  if (/^(data:image\/|blob:|https?:\/\/)/i.test(value)) {
    return value;
  }

  if (value.startsWith("//")) {
    return `${window.location.protocol}${value}`;
  }

  const contentType = getBase64ImageContentType(value);
  if (contentType) {
    return `data:${contentType};base64,${value}`;
  }

  if (value.startsWith("/")) {
    return `${API_ASSET_BASE_URL}${value}`;
  }

  return `${API_ASSET_BASE_URL}/${value}`;
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
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
      .split("")
      .reduce(
        (total, digit, index) => total + Number(digit) * (length + 1 - index),
        0,
      );
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return getDigit(9) === Number(cpf[9]) && getDigit(10) === Number(cpf[10]);
}

export function getLocalBrazilPhoneDigits(value: string) {
  const digits = onlyDigits(value);
  const withoutCountry = digits.startsWith("55") ? digits.slice(2) : digits;
  return withoutCountry.slice(0, 11);
}

export function formatPhoneInput(value: string) {
  const localDigits = getLocalBrazilPhoneDigits(value);

  if (!localDigits) {
    return "+55 ";
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

  return (
    localDigits.length === 11 &&
    VALID_BRAZIL_AREA_CODES.has(areaCode) &&
    phone.startsWith("9") &&
    !/^(\d)\1{10}$/.test(localDigits)
  );
}

export function isValidEmail(value: string) {
  const email = value.trim();
  return (
    email.length <= MAX_EMAIL_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)
  );
}

export function getPasswordStrength(password: string) {
  if (!password) {
    return { score: 0, label: "Muito fraca" };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const labels = [
    "Muito fraca",
    "Fraca",
    "Regular",
    "Boa",
    "Forte",
    "Muito forte",
  ];
  return { score, label: labels[score] };
}

export function formatCurrency(value?: number | null) {
  return typeof value === "number"
    ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "-";
}

export function formatCurrencyInput(value: string) {
  const digits = onlyDigits(value).slice(0, MAX_CURRENCY_DIGITS);

  if (!digits) {
    return "";
  }

  const padded = digits.padStart(3, "0");
  const cents = padded.slice(-2);
  const integerDigits = padded.slice(0, -2).replace(/^0+(?=\d)/, "");
  const integerPart = integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `R$ ${integerPart},${cents}`;
}
