import type { AgendaEvent } from '../../types';
import { fromDateKey, toDateKey, eventStartDate, eventEndDate } from './agendaUtils';

export const visibleEventsPerDay = 2;
export const eventTime = (value: string) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export function indexMonthEvents(days: Date[], events: AgendaEvent[]) {
  const result = new Map(days.map(day => [toDateKey(day), [] as AgendaEvent[]]));
  if (!days.length) return result;
  const first = toDateKey(days[0]);
  const last = toDateKey(days[days.length - 1]);
  const sorted = [...events].sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || a.title.localeCompare(b.title) || a.id - b.id);
  for (const event of sorted) {
    const start = eventStartDate(event);
    const end = eventEndDate(event);
    const cursor = fromDateKey(start < first ? first : start);
    for (let key = toDateKey(cursor); key <= end && key <= last; cursor.setDate(cursor.getDate() + 1), key = toDateKey(cursor)) {
      result.get(key)?.push(event);
    }
  }
  return result;
}
