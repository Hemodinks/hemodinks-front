export const DEFAULT_PATIENT_BIRTH_DATE = "1900-01-01";
export const PAGE_SIZE = 10;
export const PATIENT_EXPORT_PAGE_SIZE = 100;
export const LOOKUP_PAGE_SIZE = 100;
export const CBHPM_PAGE_SIZE = 10;
export const MAX_NAME_LENGTH = 255;
export const MAX_DIAGNOSIS_LENGTH = 100;
export const MAX_TREATMENT_MEDICAL_LENGTH = 100;
export const MAX_OBSERVATION_LENGTH = 500;
export const MAX_EMAIL_LENGTH = 255;
export const MAX_PHONE_LENGTH = 20;
export const MAX_CPF_LENGTH = 14;
export const MAX_CRM_LENGTH = 20;
export const MAX_PASSWORD_LENGTH = 500;
export const MAX_CURRENCY_DIGITS = 15;
export const MEDICAL_USERS_DATALIST_ID = "hemodinks-medical-users-options";
export const CONVENIOS_DATALIST_ID = "hemodinks-convenios-options";
export const HOSPITAIS_DATALIST_ID = "hemodinks-hospitais-options";
export const OPME_FORNECEDORES_DATALIST_ID = "hemodinks-opme-fornecedores-options";
export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_PATIENT_FILE_BYTES = 10 * 1024 * 1024;
export const MEDICAL_PROFILE_ID = 2;
export const PATIENT_PROFILE_ID = 3;
export const CONTROLLER_PROFILE_ID = 4;
export const SUPER_ADMIN_PROFILE_ID = 5;
export const TEAM_PROFILE_ID = 6;
export const DEFAULT_PROFILE_ID = MEDICAL_PROFILE_ID;
export const API_ASSET_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export const PROFILE_OPTIONS = [
  { id: 1, nome: "Administrador" },
  { id: 2, nome: "Médicos" },
  { id: 3, nome: "Paciente" },
  { id: 4, nome: "Controller" },
  { id: 5, nome: "SuperAdministrador" },
  { id: 6, nome: "Equipe" },
] as const;

export const USER_PROFILE_OPTIONS = PROFILE_OPTIONS.filter(
  (profile) =>
    profile.id !== PATIENT_PROFILE_ID &&
    profile.id !== SUPER_ADMIN_PROFILE_ID &&
    profile.id !== TEAM_PROFILE_ID,
);

export const BRAZIL_UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT",
  "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO",
  "RR", "SC", "SP", "SE", "TO",
] as const;

export const ALLOWED_PROFILE_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const ALLOWED_PATIENT_FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export const VALID_BRAZIL_AREA_CODES = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "22",
  "24", "27", "28", "31", "32", "33", "34", "35", "37", "38", "41",
  "42", "43", "44", "45", "46", "47", "48", "49", "51", "53", "54",
  "55", "61", "62", "63", "64", "65", "66", "67", "68", "69", "71",
  "73", "74", "75", "77", "79", "81", "82", "83", "84", "85", "86",
  "87", "88", "89", "91", "92", "93", "94", "95", "96", "97", "98",
  "99",
]);
