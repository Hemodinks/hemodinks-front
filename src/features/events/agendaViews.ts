import type { AgendaEvent } from '../../types';
import { fromDateKey, monthGrid, toDateKey } from './agendaUtils';

export type AgendaView = 'month' | 'week' | 'list';
export function weekDays(dateKey: string) {
  const first = fromDateKey(dateKey);
  first.setDate(first.getDate() - (first.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(first); day.setDate(first.getDate() + index); return day;
  });
}
export function agendaRange(view: AgendaView, month: Date, selectedDate: string) {
  const days = view === 'week' ? weekDays(selectedDate) : view === 'month' ? monthGrid(month)
    : [new Date(month.getFullYear(), month.getMonth(), 1), new Date(month.getFullYear(), month.getMonth() + 1, 0)];
  const last = new Date(days[days.length - 1]); last.setHours(23, 59, 59, 999);
  return { from: days[0].toISOString(), to: last.toISOString() };
}
export function eventsInRange(events: AgendaEvent[], from: string, to: string) {
  return events.filter(event => Date.parse(event.end) >= Date.parse(from) && Date.parse(event.start) <= Date.parse(to));
}
export function listEventGroups(events: AgendaEvent[], firstDate: string, today: string) {
  const tomorrow = fromDateKey(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrow);
  const groups = new Map<string, AgendaEvent[]>();
  [...events].sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || a.id - b.id).forEach(event => {
    const start = toDateKey(new Date(event.start));
    const day = start < firstDate ? firstDate : start;
    groups.set(day, [...(groups.get(day) ?? []), event]);
  });
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({ date, events: items,
    section: date < today ? 'Dias anteriores' : date === today ? 'Hoje' : date === tomorrowKey ? 'Amanhã' : 'Próximos dias' }));
}
