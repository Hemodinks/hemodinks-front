import type { AgendaFormData } from './agendaUtils';

export type AgendaScheduleField = 'title' | 'startDate' | 'startTime' | 'endDate' | 'endTime';
export type AgendaFieldErrors = Partial<Record<AgendaScheduleField, string>>;
export const endAfterStartMessage = 'O término deve ser posterior ao início.';

export function isAgendaDateValid(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1) return false;
  const date = new Date(`${value}T12:00:00`);
  const [year, month, day] = value.split('-').map(Number);
  return Number.isFinite(date.getTime()) && date.getFullYear() === year
    && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isAgendaTimeValid(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function parseAgendaDateTime(dateValue: string, timeValue: string): Date | null {
  if (!isAgendaDateValid(dateValue) || !isAgendaTimeValid(timeValue)) return null;
  const date = new Date(`${dateValue}T${timeValue}:00`);
  // Reject local times normalized by the browser across a daylight-saving gap.
  return date.getHours() === Number(timeValue.slice(0, 2))
    && date.getMinutes() === Number(timeValue.slice(3)) ? date : null;
}

export function validateAgendaSchedule(form: AgendaFormData): AgendaFieldErrors {
  const errors: AgendaFieldErrors = {};
  if (!form.title.trim()) errors.title = 'Título é obrigatório.';
  if (!isAgendaDateValid(form.startDate)) errors.startDate = 'Informe uma data válida.';
  if (!isAgendaDateValid(form.endDate)) errors.endDate = 'Informe uma data válida.';
  if (!isAgendaTimeValid(form.startTime)) errors.startTime = 'Informe um horário válido.';
  if (!isAgendaTimeValid(form.endTime)) errors.endTime = 'Informe um horário válido.';
  const start = parseAgendaDateTime(form.startDate, form.startTime);
  const end = parseAgendaDateTime(form.endDate, form.endTime);
  if (!errors.startDate && !errors.startTime && !start) errors.startTime = 'Informe um horário válido.';
  if (!errors.endDate && !errors.endTime && !end) errors.endTime = 'Informe um horário válido.';
  if (start && end && end <= start) {
    errors.endDate = endAfterStartMessage;
    errors.endTime = endAfterStartMessage;
  }
  return errors;
}

export function suggestAgendaEnd(dateValue: string, timeValue: string) {
  const start = parseAgendaDateTime(dateValue, timeValue);
  if (!start) return null;
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  if (end.getFullYear() > 9999) return null;
  const pad = (value: number) => String(value).padStart(2, '0');
  return { endDate: `${String(end.getFullYear()).padStart(4, '0')}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
    endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}` };
}

export function agendaServerFieldErrors(error: unknown): AgendaFieldErrors {
  const message = error instanceof Error ? error.message : '';
  if (message === 'Título é obrigatório.') return { title: message };
  if (message === endAfterStartMessage) return { endDate: message, endTime: message };
  if (message === 'Informe uma data e um horário de início válidos.') return { startDate: message, startTime: message };
  if (message === 'Informe uma data e um horário de término válidos.') return { endDate: message, endTime: message };
  return {};
}
