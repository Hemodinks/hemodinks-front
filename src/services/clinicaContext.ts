type ClinicaRequestContext = {
  clinicaId?: number;
  clinicaSlug?: string;
};

const RESERVED_HOST_SUFFIXES = [
  '.onrender.com',
  '.vercel.app',
  '.netlify.app',
];

function normalizeClinicaSlug(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function parseClinicaId(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function decodeJwtPayload(token: string) {
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    const base64 = segments[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(segments[1].length / 4) * 4, '=');

    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getBrowserHostname() {
  return typeof window === 'undefined' ? null : window.location.hostname;
}

export function resolveClinicaSlugFromHostname(hostname?: string | null) {
  if (!hostname) {
    return null;
  }

  const normalizedHost = hostname.trim().toLowerCase();
  if (!normalizedHost || normalizedHost === 'localhost') {
    return null;
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalizedHost)) {
    return null;
  }

  if (RESERVED_HOST_SUFFIXES.some((suffix) => normalizedHost.endsWith(suffix))) {
    return null;
  }

  const hostWithoutWww = normalizedHost.startsWith('www.')
    ? normalizedHost.slice(4)
    : normalizedHost;
  const segments = hostWithoutWww.split('.').filter(Boolean);

  if (segments.length >= 3) {
    return normalizeClinicaSlug(segments[0]);
  }

  if (segments.length === 2 && segments[1] === 'localhost') {
    return normalizeClinicaSlug(segments[0]);
  }

  return null;
}

export function extractClinicaContextFromToken(token?: string) {
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  const clinicaId = parseClinicaId(typeof payload.clinicaId === 'string' ? payload.clinicaId : null);
  const clinicaSlug = normalizeClinicaSlug(typeof payload.clinicaSlug === 'string' ? payload.clinicaSlug : null);

  if (!clinicaId && !clinicaSlug) {
    return null;
  }

  return {
    ...(clinicaId ? { clinicaId } : {}),
    ...(clinicaSlug ? { clinicaSlug } : {}),
  } satisfies ClinicaRequestContext;
}

function resolveConfiguredClinicaContext() {
  const clinicaId = parseClinicaId(import.meta.env.VITE_CLINICA_ID);
  const clinicaSlug = normalizeClinicaSlug(import.meta.env.VITE_CLINICA_SLUG)
    ?? resolveClinicaSlugFromHostname(getBrowserHostname());

  if (!clinicaId && !clinicaSlug) {
    return null;
  }

  return {
    ...(clinicaId ? { clinicaId } : {}),
    ...(clinicaSlug ? { clinicaSlug } : {}),
  } satisfies ClinicaRequestContext;
}

export function resolveClinicaRequestHeaders(token?: string) {
  const context = extractClinicaContextFromToken(token) ?? resolveConfiguredClinicaContext();
  if (!context) {
    return {};
  }

  return {
    ...(context.clinicaSlug ? { 'X-Clinica-Slug': context.clinicaSlug } : {}),
    ...(context.clinicaId ? { 'X-Clinica-Id': String(context.clinicaId) } : {}),
  };
}
