import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { expect, it } from 'vitest';
import type { AgendaEvent } from '../../types';
import { buildEmptyForm, eventTouchesDate, monthGrid } from './agendaUtils';
import { validateAgendaSchedule } from './agendaDateTime';
import { indexMonthEvents } from './agendaMonth';
import { eventsInRange, listEventGroups } from './agendaViews';
import { AgendaScheduleFields } from './AgendaScheduleFields';
import { NotificationsModal } from '../dashboard/NotificationsModal';
const allDay = { id: 1, isAllDay: true, allDayStartDate: '2026-09-26', allDayEndDate: '2026-09-28', timeZoneId: 'Pacific/Kiritimati', start: '2026-09-25T10:00:00Z', end: '2026-09-28T10:00:00Z' } as AgendaEvent;
it('accepts a single civil day and multiple days without validating hidden times', () => {
  const form = { ...buildEmptyForm('2026-09-26'), title: 'Dia inteiro', isAllDay: true, startTime: '', endTime: 'invalid', startDate: '2026-09-26', endDate: '2026-09-26' };
  expect(validateAgendaSchedule(form)).toEqual({});
  expect(validateAgendaSchedule({ ...form, endDate: '2026-09-28' })).toEqual({});
  expect(validateAgendaSchedule({ ...form, endDate: '2026-09-25' }).endDate).toBeDefined();
  expect(validateAgendaSchedule({ ...form, endDate: '2026-02-30' }).endDate).toBe('Informe uma data válida.');
});
it('indexes civil dates without including either adjacent day or shifting list dates', () => {
  const indexed = indexMonthEvents(monthGrid(new Date(2026, 8, 1)), [allDay]);
  expect([...indexed].filter(([, events]) => events.length).map(([date]) => date)).toEqual(['2026-09-26', '2026-09-27', '2026-09-28']);
  expect(eventTouchesDate(allDay, '2026-09-29')).toBe(false);
  expect(eventTouchesDate(allDay, '2026-09-25')).toBe(false);
  const oneDay = { ...allDay, allDayEndDate: '2026-09-26', end: '2026-09-26T10:00:00Z' };
  expect(eventsInRange([oneDay], new Date(2026, 8, 26).toISOString(), new Date(2026, 8, 26, 23, 59).toISOString())).toEqual([oneDay]);
  expect(listEventGroups([oneDay], '2026-09-01', '2026-09-26')[0]).toMatchObject({ date: '2026-09-26', section: 'Hoje' });
});
it('hides times while retaining dates and restores typed times when unchecked', () => {
  function Form() {
    const [form, setForm] = useState({ ...buildEmptyForm('2026-09-26'), startTime: '16:00', endTime: '17:00', endDate: '2026-09-28' });
    return <AgendaScheduleFields formData={form} errors={{}} onAllDayChange={isAllDay => setForm({ ...form, isAllDay })}
      onChange={(field, value) => setForm({ ...form, [field]: value })} onDescriptionChange={() => {}} />;
  }
  render(<Form />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Evento de dia inteiro' }));
  expect(screen.queryAllByLabelText('Hora')).toHaveLength(0);
  expect(screen.getByLabelText('Início')).toHaveValue('2026-09-26');
  expect(screen.getByLabelText('Término')).toHaveValue('2026-09-28');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Evento de dia inteiro' }));
  expect(screen.getAllByLabelText('Hora').map(input => (input as HTMLInputElement).value)).toEqual(['16:00', '17:00']);
});
it('notifications show date-only boundaries instead of converting the UTC projection', () => {
  render(<NotificationsModal notifications={[{ id: 1, tipo: 'EventoAgenda', titulo: 'Evento', mensagem: 'Descrição', pacienteId: 0, nomePaciente: '', data: allDay.start, allDayStartDate: allDay.allDayStartDate, allDayEndDate: allDay.allDayEndDate }]}
    loading={false} error="" totalCount={1} onClose={() => {}} onOpenObservation={() => {}} />);
  expect(within(screen.getByRole('dialog')).getByText('Dia inteiro · 26/09/2026 a 28/09/2026')).toBeInTheDocument();
});
