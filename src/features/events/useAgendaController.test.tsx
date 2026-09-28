import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, type FormEvent } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import * as services from '../../services';
import type { AgendaEvent, AuthSession } from '../../types';
import { useAgendaController } from './useAgendaController';
import { buildEmptyForm } from './agendaUtils';

vi.mock('../../services', () => ({
  getAgendaEvents: vi.fn(), getAgendaMedicalUsers: vi.fn(), getAgendaNotificationRecipientOptions: vi.fn(),
  getBrazilPublicHolidays: vi.fn(), createAgendaEvent: vi.fn(), updateAgendaEvent: vi.fn(),
  completeAgendaEvent: vi.fn(), deleteAgendaEvent: vi.fn(),
}));
const session = { token: 'token', user: { id: 1, clinicaId: 1, perfilId: 1 } } as AuthSession;
const submit = () => ({ preventDefault: vi.fn(), currentTarget: document.createElement('form') }) as unknown as FormEvent<HTMLFormElement>;
const saved = { id: 1, title: 'Evento', userId: 1, start: new Date(2026, 8, 26, 16).toISOString(),
  end: new Date(2026, 8, 26, 18).toISOString(), notifyUser: true } as AgendaEvent;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(services.getAgendaEvents).mockResolvedValue([]);
  vi.mocked(services.getAgendaMedicalUsers).mockResolvedValue([]);
  vi.mocked(services.getAgendaNotificationRecipientOptions).mockResolvedValue({ users: [], groups: [], canNotifyAllAllowedRecipients: true, allRecipientsLabel: 'Todos' });
  vi.mocked(services.getBrazilPublicHolidays).mockResolvedValue([]);
  vi.mocked(services.createAgendaEvent).mockResolvedValue(saved);
  vi.mocked(services.updateAgendaEvent).mockResolvedValue(saved);
});
async function setup() {
  const hook = renderHook(() => useAgendaController({ session, isMedical: false }));
  await waitFor(() => expect(hook.result.current.notificationRecipientsLoading).toBe(false));
  act(() => hook.result.current.resetForm('2026-09-26'));
  return hook;
}
it('suggests end until the user changes it, including after clearing it', async () => {
  const { result } = await setup();
  act(() => result.current.changeScheduleField('startTime', '16:00'));
  expect(result.current.formData.endTime).toBe('17:00');
  act(() => result.current.changeScheduleField('endTime', '20:00'));
  act(() => result.current.changeScheduleField('startTime', '18:00'));
  expect(result.current.formData.endTime).toBe('20:00');
  act(() => result.current.changeScheduleField('endTime', ''));
  act(() => result.current.changeScheduleField('startTime', '19:00'));
  expect(result.current.formData.endTime).toBe('');
  act(() => result.current.resetForm('2026-09-26'));
  act(() => result.current.changeScheduleField('startTime', '23:30'));
  expect(result.current.formData).toMatchObject({ endDate: '2026-09-27', endTime: '00:30' });
});
it('does not overwrite manual end date through calendar selection', async () => {
  const { result } = await setup();
  act(() => result.current.changeScheduleField('endDate', '2026-09-30'));
  act(() => result.current.handleSelectDate(new Date(2026, 8, 28)));
  expect(result.current.formData.endDate).toBe('2026-09-30');
});
it('preserves end while editing and sends UTC through PUT', async () => {
  const { result } = await setup();
  act(() => result.current.handleEdit(saved));
  act(() => result.current.changeScheduleField('startTime', '17:00'));
  expect(result.current.formData.endTime).toBe('18:00');
  await act(() => result.current.handleSubmit(submit()));
  expect(services.updateAgendaEvent).toHaveBeenCalledWith(1, expect.objectContaining({
    start: new Date(2026, 8, 26, 17).toISOString(), end: saved.end,
  }), 'token');
});
it('validates before POST and sends a valid cross-day event', async () => {
  const { result } = await setup();
  act(() => result.current.setFormData({ ...buildEmptyForm('2026-09-26'), startTime: '25:00' }));
  await act(() => result.current.handleSubmit(submit()));
  expect(services.createAgendaEvent).not.toHaveBeenCalled();
  expect(result.current.fieldErrors).toMatchObject({ title: 'Título é obrigatório.', startTime: 'Informe um horário válido.' });
  act(() => result.current.changeScheduleField('title', 'Evento'));
  act(() => result.current.changeScheduleField('startTime', '23:30'));
  await act(() => result.current.handleSubmit(submit()));
  expect(services.createAgendaEvent).toHaveBeenCalledWith(expect.objectContaining({
    start: new Date(2026, 8, 26, 23, 30).toISOString(), end: new Date(2026, 8, 27, 0, 30).toISOString(),
  }), 'token');
});
it('maps final API validation to the end fields', async () => {
  const { result } = await setup();
  act(() => result.current.changeScheduleField('title', 'Evento'));
  vi.mocked(services.createAgendaEvent).mockRejectedValue(new Error('O término deve ser posterior ao início.'));
  await act(() => result.current.handleSubmit(submit()));
  expect(result.current.fieldErrors.endTime).toBe('O término deve ser posterior ao início.');
});

it('loads one complete grid interval and does not refetch on selection within a month', async () => {
  const { result } = await setup();
  const initial = vi.mocked(services.getAgendaEvents).mock.calls.length;
  const [, from, to] = vi.mocked(services.getAgendaEvents).mock.lastCall!;
  expect(new Date(from!).getHours()).toBe(0);
  expect(new Date(to!).getHours()).toBe(23);
  expect(new Date(to!).getMilliseconds()).toBe(999);
  act(() => result.current.handleSelectDate(new Date(result.current.visibleMonth.getFullYear(), result.current.visibleMonth.getMonth(), 15)));
  expect(services.getAgendaEvents).toHaveBeenCalledTimes(initial);
  act(() => result.current.handleNextMonth());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(services.getAgendaEvents).toHaveBeenCalledTimes(initial + 1);
  expect(result.current.selectedDate.endsWith('-01')).toBe(true);
});
it('ignores a previous month response that arrives after the current month', async () => {
  const { result } = await setup();
  let oldResponse!: (events: AgendaEvent[]) => void;
  vi.mocked(services.getAgendaEvents).mockImplementationOnce(() => new Promise(resolve => { oldResponse = resolve; }));
  act(() => result.current.handleNextMonth());
  vi.mocked(services.getAgendaEvents).mockResolvedValueOnce([saved]);
  act(() => result.current.handleNextMonth());
  await waitFor(() => expect(result.current.events).toEqual([saved]));
  await act(async () => oldResponse([]));
  expect(result.current.events).toEqual([saved]);
});

it('shares the in-flight interval request during StrictMode effect replay', async () => {
  const { result } = renderHook(() => useAgendaController({ session, isMedical: false }), {
    wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
  });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(services.getAgendaEvents).toHaveBeenCalledTimes(1);
});
