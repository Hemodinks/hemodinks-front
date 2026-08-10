import type { AgendaEvent, PublicHoliday } from '../../types';

export type AgendaFormData = {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  notifyMedicalProfile: boolean;
  medicalUserId: string;
  notifyUser: boolean;
  reminderPeriodMinutes: string;
  notificationMessage: string;
  notifyAllAllowedRecipients: boolean;
  notificationUserIds: number[];
  notificationGroupIds: number[];
};

export type AgendaSection = 'calendario' | 'cadastro';

export const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
export const defaultReminderMinutes = '1440';

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function monthTitle(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

export function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function toTimeInput(date: Date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export function buildEmptyForm(
  dateKey = toDateKey(new Date()),
  isMedical = false,
  userId?: number,
  now = new Date(),
): AgendaFormData {
  const start = toDateKey(now) === dateKey ? new Date(now.getTime() + 60 * 60 * 1000) : new Date(`${dateKey}T09:00:00`);
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return {
    title: '',
    description: '',
    startDate: toDateKey(start),
    startTime: toTimeInput(start),
    endDate: toDateKey(end),
    endTime: toTimeInput(end),
    notifyMedicalProfile: false,
    medicalUserId: isMedical && userId ? String(userId) : '',
    notifyUser: true,
    reminderPeriodMinutes: defaultReminderMinutes,
    notificationMessage: '',
    notifyAllAllowedRecipients: false,
    notificationUserIds: [],
    notificationGroupIds: [],
  };
}

export function monthGrid(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function eventTouchesDate(event: AgendaEvent, dateKey: string) {
  const startKey = toDateKey(new Date(event.start));
  const endKey = toDateKey(new Date(event.end));
  return startKey <= dateKey && endKey >= dateKey;
}

export function mergeAgendaEvent(currentEvents: AgendaEvent[], agendaEvent: AgendaEvent) {
  return [...currentEvents.filter((item) => item.id !== agendaEvent.id), agendaEvent]
    .sort((first, second) => new Date(first.start).getTime() - new Date(second.start).getTime());
}

export function composeDateTime(dateKey: string, timeValue: string) {
  return new Date(`${dateKey}T${timeValue || '00:00'}:00`);
}

export function getHolidayTitle(holiday?: PublicHoliday) {
  if (!holiday) {
    return '';
  }

  return holiday.localName || holiday.name;
}
