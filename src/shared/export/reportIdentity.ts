import { getSystemSettingsCompanyPhoto } from '../../services';
import defaultCompanyLogo from '../../../imagem hemodinks github.jpg';

export const DEFAULT_REPORT_COLOR = '#14877D';
export const EMPTY_REPORT_VALUE = 'Não informado';

export type ReportLogo = {
  bytes: Uint8Array;
  extension: 'png' | 'jpeg';
  width: number;
  height: number;
};

export type ReportIdentity = {
  clinicName: string;
  title: string;
  generatedAt: Date;
  primaryColor: string;
  contextLines: string[];
  logo: ReportLogo | null;
};

export type ReportIdentityOptions = {
  clinicName: string;
  title: string;
  sessionToken?: string;
  generatedAt?: Date;
  primaryColor?: string | null;
  contextLines?: Array<string | null | undefined>;
  logoLoader?: () => Promise<Blob>;
};

function readPngSize(bytes: Uint8Array) {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20), extension: 'png' as const };
}

function readJpegSize(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (length < 2) return null;
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        width: (bytes[offset + 7] << 8) + bytes[offset + 8],
        height: (bytes[offset + 5] << 8) + bytes[offset + 6],
        extension: 'jpeg' as const,
      };
    }
    offset += length + 2;
  }
  return null;
}

async function convertImageToPng(blob: Blob): Promise<Blob | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;

  let image: ImageBitmap | null = null;
  try {
    image = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  } catch {
    return null;
  } finally {
    image?.close();
  }
}

export async function normalizeReportLogo(blob: Blob): Promise<ReportLogo | null> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const size = readPngSize(bytes) ?? readJpegSize(bytes);
  if (!size || !size.width || !size.height) {
    const converted = await convertImageToPng(blob);
    return converted ? normalizeReportLogo(converted) : null;
  }
  if (typeof createImageBitmap === 'function') {
    try {
      const image = await createImageBitmap(blob);
      const normalized = { bytes, extension: size.extension, width: image.width, height: image.height };
      image.close();
      return normalized;
    } catch {
      return null;
    }
  }
  return { bytes, ...size };
}

export async function loadClinicReportLogo(sessionToken?: string, logoLoader?: () => Promise<Blob>) {
  const loaders = [
    logoLoader ?? (() => getSystemSettingsCompanyPhoto(sessionToken)),
    () => fetch(defaultCompanyLogo).then((response) => {
      if (!response.ok) throw new Error('Não foi possível carregar a marca padrão.');
      return response.blob();
    }),
  ];

  for (const load of loaders) {
    try {
      const logo = await normalizeReportLogo(await load());
      if (logo) return logo;
    } catch {
      // A ausência de uma imagem específica da clínica usa a mesma marca padrão da interface.
    }
  }

  return null;
}

export function normalizeReportValue(value: unknown) {
  const text = value == null ? '' : String(value).trim();
  return !text || text === '-' ? EMPTY_REPORT_VALUE : text;
}

export function normalizeReportColor(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^#[0-9A-F]{6}$/.test(normalized) ? normalized : DEFAULT_REPORT_COLOR;
}

export function reportColorToRgb(value: string): [number, number, number] {
  const color = normalizeReportColor(value);
  return [Number.parseInt(color.slice(1, 3), 16), Number.parseInt(color.slice(3, 5), 16), Number.parseInt(color.slice(5, 7), 16)];
}

export function getReportContrastColor(value: string): '#FFFFFF' | '#111827' {
  const [red, green, blue] = reportColorToRgb(value);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? '#111827' : '#FFFFFF';
}

export function formatReportGenerationDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export async function resolveReportIdentity(options: ReportIdentityOptions): Promise<ReportIdentity> {
  return {
    clinicName: normalizeReportValue(options.clinicName),
    title: normalizeReportValue(options.title),
    generatedAt: options.generatedAt ?? new Date(),
    primaryColor: normalizeReportColor(options.primaryColor),
    contextLines: (options.contextLines ?? []).map(normalizeReportValue).filter((line) => line !== EMPTY_REPORT_VALUE),
    logo: await loadClinicReportLogo(options.sessionToken, options.logoLoader),
  };
}

export function fitReportLogo(logo: ReportLogo, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height);
  return { width: logo.width * scale, height: logo.height * scale };
}
