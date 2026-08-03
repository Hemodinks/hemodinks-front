import { describe, expect, it, vi } from 'vitest';
import type { AgendaEvent, PublicHoliday } from './agendaTypes';
import {
  buildEmptyForm,
  composeDateTime,
  eventTouchesDate,
  formatDateTime,
  fromDateKey,
  getHolidayTitle,
  mergeAgendaEvent,
  monthGrid,
  monthTitle,
  toDateKey,
  toTimeInput,
} from './agendaUtils';

const event = (overrides: Partial<AgendaEvent> = {}): AgendaEvent => ({
  id: 1,
  userId: 9,
  userName: 'Ana',
  title: 'Consulta',
  start: '2026-07-10T09:00:00',
  end: '2026-07-10T10:00:00',
  notifyMedicalProfile: false,
  notifyUser: true,
  isCompleted: false,
  createdAt: '2026-07-01T00:00:00Z',
  ...overrides,
});

describe('agendaUtils', () => {
  it('converte datas locais sem deslocar o dia', () => {
    const date = new Date(2026, 6, 9, 8, 5);

    expect(toDateKey(date)).toBe('2026-07-09');
    expect(toTimeInput(date)).toBe('08:05');
    expect(fromDateKey('2026-07-09')).toEqual(new Date(2026, 6, 9));
    expect(composeDateTime('2026-07-09', '')).toEqual(new Date(2026, 6, 9, 0, 0));
    expect(monthTitle(date)).toMatch(/julho.*2026/i);
  });

  it('monta o formulário no próximo horário cheio ou às 09h de outro dia', () => {
    const now = new Date(2026, 6, 9, 8, 37);

    expect(buildEmptyForm('2026-07-09', true, 42, now)).toMatchObject({
      startDate: '2026-07-09',
      startTime: '09:00',
      endTime: '10:00',
      medicalUserId: '42',
      notifyUser: true,
    });
    expect(buildEmptyForm('2026-07-11', false, undefined, now)).toMatchObject({
      startDate: '2026-07-11',
      startTime: '09:00',
      medicalUserId: '',
    });
  });

  it('gera uma grade de seis semanas começando no domingo', () => {
    const days = monthGrid(new Date(2026, 6, 15));

    expect(days).toHaveLength(42);
    expect(days[0].getDay()).toBe(0);
    expect(days.some((date) => date.getMonth() === 6)).toBe(true);
  });

  it('identifica eventos de vários dias e mescla por id em ordem cronológica', () => {
    const longEvent = event({
      start: '2026-07-09T22:00:00',
      end: '2026-07-11T01:00:00',
    });
    expect(eventTouchesDate(longEvent, '2026-07-10')).toBe(true);
    expect(eventTouchesDate(longEvent, '2026-07-12')).toBe(false);

    const merged = mergeAgendaEvent(
      [event({ id: 1, start: '2026-07-12T10:00:00' }), event({ id: 2 })],
      event({ id: 1, title: 'Atualizado', start: '2026-07-08T10:00:00' }),
    );
    expect(merged.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: 1, title: 'Atualizado' },
      { id: 2, title: 'Consulta' },
    ]);
  });

  it('formata datas válidas e preserva valores inválidos', () => {
    expect(formatDateTime('valor-inválido')).toBe('valor-inválido');
    expect(formatDateTime('2026-07-10T09:00:00')).toMatch(/10\/07.*09:00/);
  });

  it('prioriza o nome local do feriado', () => {
    const holiday: PublicHoliday = {
      date: '2026-09-07',
      localName: 'Independência do Brasil',
      name: 'Independence Day',
      global: true,
      types: ['Public'],
    };

    expect(getHolidayTitle(holiday)).toBe('Independência do Brasil');
    expect(getHolidayTitle({ ...holiday, localName: '' })).toBe('Independence Day');
    expect(getHolidayTitle()).toBe('');
  });
});
