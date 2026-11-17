import type { PlatformActiveSession } from '../../types/activeSessions';

export type SessionStatus = 'online' | 'recent';
export type SessionRow = PlatformActiveSession & { status: SessionStatus };
export type SessionSortField = 'status' | 'nome' | 'perfil' | 'clinica' | 'inicio' | 'ultimaAtividade' | 'navegador';
export type SortDirection = 'asc' | 'desc';

const HAS_TIMEZONE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

// A API grava UTC; versões anteriores ao #284 serializavam sem fuso, e o navegador lia como hora local.
export function parseApiInstant(value: string | null | undefined) {
  if (!value) return null;
  const text = value.trim();
  const date = new Date(HAS_TIMEZONE.test(text) || !text.includes('T') ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dayFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

// Hora e dia separados: a hora fica em destaque e o dia em linha menor (cabe em tablet sem rolagem).
export function formatSessionTime(value: string) {
  const date = parseApiInstant(value);
  return date ? { time: timeFormatter.format(date), day: dayFormatter.format(date) } : { time: '-', day: '' };
}

export function formatElapsed(value: string, now: Date) {
  const date = parseApiInstant(value);
  if (!date) return '';
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `há ${hours} h ${rest} min` : `há ${hours} h`;
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const timeOf = (value: string) => parseApiInstant(value)?.getTime() ?? 0;
const statusRank = (status: SessionStatus) => (status === 'online' ? 0 : 1);

function compareField(a: SessionRow, b: SessionRow, field: SessionSortField) {
  switch (field) {
    case 'status': return statusRank(a.status) - statusRank(b.status);
    case 'inicio': return timeOf(a.inicio) - timeOf(b.inicio);
    case 'ultimaAtividade': return timeOf(a.ultimaAtividade) - timeOf(b.ultimaAtividade);
    default: return collator.compare(a[field] ?? '', b[field] ?? '');
  }
}

// Desempate estável: atividade mais recente primeiro e, depois, nome.
export function sortSessionRows(rows: SessionRow[], field: SessionSortField, direction: SortDirection) {
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * compareField(a, b, field)
    || timeOf(b.ultimaAtividade) - timeOf(a.ultimaAtividade)
    || collator.compare(a.nome, b.nome));
}

// Datas abrem pela mais recente; texto e status, em ordem crescente.
export const defaultDirectionFor = (field: SessionSortField): SortDirection =>
  field === 'inicio' || field === 'ultimaAtividade' ? 'desc' : 'asc';
