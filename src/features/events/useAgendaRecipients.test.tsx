import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { AgendaMedicalUser, AgendaNotificationRecipientOptions, AuthSession } from '../../types';
import { getAgendaMedicalUsers, getAgendaNotificationRecipientOptions } from '../../services';
import { useAgendaRecipients } from './useAgendaRecipients';
vi.mock('../../services', () => ({ getAgendaMedicalUsers: vi.fn(), getAgendaNotificationRecipientOptions: vi.fn() }));
it('discards responses from the previous clinic even when they finish last', async () => {
  const a = { token: 'a', user: { id: 1, clinicaId: 1 } } as AuthSession;
  const b = { token: 'b', user: { id: 2, clinicaId: 2 } } as AuthSession;
  let resolveDoctors!: (data: AgendaMedicalUser[]) => void;
  let resolveOptions!: (data: AgendaNotificationRecipientOptions) => void;
  vi.mocked(getAgendaMedicalUsers).mockImplementation(token => token === 'a'
    ? new Promise(resolve => { resolveDoctors = resolve; }) : Promise.resolve([{ id: 2, nome: 'Beta' }]));
  const options = (id: number) => ({ users: [], groups: [{ id, nome: `Group ${id}`, membrosCount: 1 }], canNotifyAllAllowedRecipients: true, allRecipientsLabel: 'Todos' });
  vi.mocked(getAgendaNotificationRecipientOptions).mockImplementation(token => token === 'a'
    ? new Promise(resolve => { resolveOptions = resolve; }) : Promise.resolve(options(2)));
  const { result, rerender } = renderHook(({ session }) => useAgendaRecipients(session), { initialProps: { session: a } });
  rerender({ session: b });
  await waitFor(() => expect(result.current.medicalUsers[0]?.nome).toBe('Beta'));
  await act(async () => { resolveDoctors([{ id: 1, nome: 'Alpha' }]); resolveOptions(options(1)); });
  expect(result.current.medicalUsers).toEqual([{ id: 2, nome: 'Beta' }]);
  expect(result.current.notificationRecipientOptions?.groups).toEqual(options(2).groups);
});

it('clears visible options immediately on clinic change and stays empty on failure', async () => {
  const a = { token: 'a', user: { id: 1, clinicaId: 1 } } as AuthSession;
  const b = { token: 'b', user: { id: 2, clinicaId: 2 } } as AuthSession;
  let rejectOptions!: (error: Error) => void;
  vi.mocked(getAgendaMedicalUsers).mockResolvedValue([{ id: 1, nome: 'Alpha' }]);
  vi.mocked(getAgendaNotificationRecipientOptions).mockImplementation(token => token === 'a'
    ? Promise.resolve({ users: [], groups: [{ id: 1, nome: 'Alpha group', membrosCount: 1 }], canNotifyAllAllowedRecipients: true, allRecipientsLabel: 'Todos' })
    : new Promise((_, reject) => { rejectOptions = reject; }));
  const { result, rerender } = renderHook(({ session }) => useAgendaRecipients(session), { initialProps: { session: a } });
  await waitFor(() => expect(result.current.medicalUsers).toHaveLength(1));
  rerender({ session: b });
  expect(result.current.medicalUsers).toEqual([]);
  expect(result.current.notificationRecipientOptions).toBeNull();
  await act(async () => rejectOptions(new Error('Falha ao carregar destinatários')));
  expect(result.current.medicalUsers).toEqual([]);
  expect(result.current.notificationRecipientOptions).toBeNull();
  expect(result.current.notificationRecipientsError).toBeTruthy();
});
