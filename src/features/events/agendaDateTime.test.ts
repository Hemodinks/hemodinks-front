import { describe, expect, it } from 'vitest';
import { buildEmptyForm } from './agendaUtils';
import { isAgendaDateValid, isAgendaTimeValid, parseAgendaDateTime, suggestAgendaEnd, validateAgendaSchedule } from './agendaDateTime';

const valid = () => ({ ...buildEmptyForm('2026-09-26'), title: 'Evento', startDate: '2026-09-26', startTime: '16:00', endDate: '2026-09-26', endTime: '17:00' });

describe('agenda dates and times', () => {
  it.each(['', '   '])('requires a title: %j', title => expect(validateAgendaSchedule({ ...valid(), title }).title).toBe('Título é obrigatório.'));
  it.each(['15:00', '16:00'])('rejects end before or equal to start: %s', endTime => {
    expect(validateAgendaSchedule({ ...valid(), endTime }).endTime).toBe('O término deve ser posterior ao início.');
  });
  it.each(['', '2026-02-30', '2026-02-29', '2026-13-01', '0000-01-01', 'invalid'])('rejects invalid date: %s', value => {
    expect(isAgendaDateValid(value)).toBe(false);
    expect(validateAgendaSchedule({ ...valid(), startDate: value }).startDate).toBe('Informe uma data válida.');
  });
  it.each(['', '24:00', '17:60', '-1:00', '1:30', 'invalid'])('rejects invalid time: %s', value => {
    expect(isAgendaTimeValid(value)).toBe(false);
    expect(validateAgendaSchedule({ ...valid(), endTime: value }).endTime).toBe('Informe um horário válido.');
  });
  it.each(['2024-02-29', '2026-09-26', '2026-12-31'])('accepts valid dates: %s', value => expect(isAgendaDateValid(value)).toBe(true));
  it.each(['00:00', '16:00', '23:59'])('accepts valid times: %s', value => expect(isAgendaTimeValid(value)).toBe(true));
  it('accepts a cross-day interval', () => {
    expect(validateAgendaSchedule({ ...valid(), startTime: '23:30', endDate: '2026-09-27', endTime: '00:30' })).toEqual({});
  });
  it('suggests one hour later including year rollover', () => {
    expect(suggestAgendaEnd('2026-09-26', '16:00')).toEqual({ endDate: '2026-09-26', endTime: '17:00' });
    expect(suggestAgendaEnd('2026-12-31', '23:30')).toEqual({ endDate: '2027-01-01', endTime: '00:30' });
    expect(suggestAgendaEnd('2026-02-30', '16:00')).toBeNull();
  });
  it('serializes browser-local time as the same UTC instant', () => {
    const local = parseAgendaDateTime('2026-09-26', '16:00')!;
    expect(local.getHours()).toBe(16);
    expect(new Date(local.toISOString()).getTime()).toBe(local.getTime());
    expect(local.toISOString()).toBe(new Date(2026, 8, 26, 16).toISOString());
  });
});
