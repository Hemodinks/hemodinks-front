import type { NamedMedicalUser } from '../domain/medicalContracts';
import {
  API_ASSET_BASE_URL,
  DEFAULT_PROFILE_ID,
  MEDICAL_PROFILE_ID,
  PROFILE_OPTIONS,
  USER_PROFILE_OPTIONS,
} from './formatterConstants';

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
  return PROFILE_OPTIONS.find((profile) => profile.id === perfilId)?.nome ?? 'Médicos';
}

export function formatProfileName(perfilId?: number | null, perfilNome?: string | null) {
  const profile = PROFILE_OPTIONS.find((item) => item.id === perfilId);
  if (profile) return profile.nome;

  const profileName = perfilNome?.trim() ?? '';
  if (!profileName) return getProfileName(DEFAULT_PROFILE_ID);

  const asciiProfileName = profileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (asciiProfileName.includes('medico') || /^m.{1,2}dicos$/i.test(profileName)) {
    return getProfileName(MEDICAL_PROFILE_ID);
  }
  return profileName;
}

export function isMedicalProfileUser(user: NamedMedicalUser) {
  const profileName = (user.perfilNome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return user.perfilId === MEDICAL_PROFILE_ID || profileName.includes('medico');
}

export function getUserInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'US';
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getBase64ImageContentType(value: string) {
  if (value.startsWith('/9j/')) return 'image/jpeg';
  if (value.startsWith('iVBORw0KGgo')) return 'image/png';
  if (value.startsWith('UklGR')) return 'image/webp';
  if (value.startsWith('R0lGOD')) return 'image/gif';
  return '';
}

export function resolveProfilePhotoSource(photo?: string | null) {
  const value = photo?.trim();
  if (!value) return '';
  if (/^(data:image\/|blob:|https?:\/\/)/i.test(value)) return value;
  if (value.startsWith('//')) return `${window.location.protocol}${value}`;

  const contentType = getBase64ImageContentType(value);
  if (contentType) return `data:${contentType};base64,${value}`;
  if (value.startsWith('/')) return `${API_ASSET_BASE_URL}${value}`;
  return `${API_ASSET_BASE_URL}/${value}`;
}
