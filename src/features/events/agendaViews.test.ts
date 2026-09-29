import { expect, it } from 'vitest';
import type { AgendaEvent } from '../../types';
import { agendaRange, listEventGroups, weekDays } from './agendaViews';
import { toDateKey } from './agendaUtils';

it('covers Monday through Sunday across month and year boundaries', () => {
  expect(weekDays('2027-01-01').map(toDateKey)).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
});
it('loads the exact week or list month including its final evening', () => {
  const range = agendaRange('week', new Date(2026, 8, 1), '2026-09-26');
  expect(toDateKey(new Date(range.from))).toBe('2026-09-21');
  expect(toDateKey(new Date(range.to))).toBe('2026-09-27');
  expect(new Date(range.to).getHours()).toBe(23);
  expect(new Date(range.to).getMilliseconds()).toBe(999);
  const list = agendaRange('list', new Date(2028, 1, 1), '2028-02-10');
  expect(toDateKey(new Date(list.to))).toBe('2028-02-29');
});
it('groups chronologically with ongoing events only once and relative date labels', () => {
  const events = [28, 26, 27, 25].map(day => ({ id: day, title: 'Evento', start: new Date(2026, 8, day, 9).toISOString(), end: new Date(2026, 8, day, 10).toISOString() } as AgendaEvent));
  events.push({ ...events[0], id: 99, start: new Date(2026, 7, 30).toISOString(), end: new Date(2026, 8, 2).toISOString() });
  const groups = listEventGroups(events, '2026-09-01', '2026-09-26');
  expect(groups.map(group => group.date)).toEqual(['2026-09-01', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28']);
  expect(groups.map(group => group.section)).toEqual(['Dias anteriores', 'Dias anteriores', 'Hoje', 'Amanhã', 'Próximos dias']);
  expect(groups.flatMap(group => group.events).filter(event => event.id === 99)).toHaveLength(1);
});
