import { expect, it } from 'vitest';
import type { AgendaEvent } from '../../types';
import { monthGrid } from './agendaUtils';
import { indexMonthEvents } from './agendaMonth';
const event = (id: number, start: string, end = start) => ({ id, title: `Evento ${id}`, start, end }) as AgendaEvent;
it('indexes an empty 42-day month including adjacent months', () => {
  const map = indexMonthEvents(monthGrid(new Date(2026, 8, 1)), []);
  expect(map.size).toBe(42);
  expect(map.get('2026-08-30')).toEqual([]);
  expect(map.get('2026-10-10')).toEqual([]);
});
it('sorts several events and includes multi-day events through the last grid day', () => {
  const spanning = event(3, '2026-09-29T23:00:00', '2026-10-11T01:00:00');
  const map = indexMonthEvents(monthGrid(new Date(2026, 8, 1)), [event(2, '2026-09-26T14:00:00'), spanning, event(1, '2026-09-26T09:00:00')]);
  expect(map.get('2026-09-26')?.map(e => e.id)).toEqual([1, 2]);
  expect(map.get('2026-10-10')).toEqual([spanning]);
  expect(map.has('2026-10-11')).toBe(false);
});
