import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { useAppChrome } from './useAppChrome';
import { mockSession } from '../test/appTestData';
import { getDashboardSummary, getDashboardNotifications, getSystemSettings } from '../services';
import type { AuthSession, DashboardSummary } from '../types';

vi.mock('../services', () => ({
  DEFAULT_SYSTEM_SETTINGS: { nomeEmpresa: 'HemoDinks' },
  getDashboardSummary: vi.fn(), getDashboardNotifications: vi.fn(), getSystemSettings: vi.fn(),
  markAgendaNotificationsAsRead: vi.fn(),
}));
afterEach(() => vi.resetAllMocks());

it('remove resumo, notificações e nome da clínica anterior antes de carregar a nova sessão', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const first = { ...mockSession(), token: 'clinic-a', user: { ...mockSession().user, clinicaId: 1 } };
  const second = { ...first, token: 'clinic-b', user: { ...first.user, clinicaId: 2 } };
  vi.mocked(getDashboardSummary).mockResolvedValueOnce({ activePatientsCount: 123 } as DashboardSummary)
    .mockImplementationOnce(() => new Promise(() => {}));
  vi.mocked(getSystemSettings).mockResolvedValueOnce({ nomeEmpresa: 'Clínica A' } as Awaited<ReturnType<typeof getSystemSettings>>)
    .mockImplementationOnce(() => new Promise(() => {}));
  vi.mocked(getDashboardNotifications).mockResolvedValueOnce([{ id: 1, titulo: 'Somente clínica A' }] as Awaited<ReturnType<typeof getDashboardNotifications>>)
    .mockImplementationOnce(() => new Promise(() => {}));
  const { result, rerender, unmount } = renderHook(({ session }: { session: AuthSession | null }) => useAppChrome({ session }), { wrapper, initialProps: { session: first as AuthSession | null } });
  act(() => result.current.setNotificationsOpen(true));
  await waitFor(() => expect(result.current.dashboardSummary?.activePatientsCount).toBe(123));
  await waitFor(() => expect(result.current.notifications).toHaveLength(1));
  expect(result.current.companyName).toBe('Clínica A');
  rerender({ session: second });
  expect(result.current.dashboardSummary).toBeNull();
  expect(result.current.notifications).toEqual([]);
  expect(result.current.companyName).not.toBe('Clínica A');
  expect(result.current.dashboardLoading).toBe(true);
  expect(getDashboardSummary).toHaveBeenLastCalledWith('clinic-b');
  rerender({ session: null });
  expect(result.current.dashboardSummary).toBeNull();
  expect(result.current.notifications).toEqual([]);
  unmount(); client.clear();
});

it('ignora resposta atrasada da clínica anterior e não substitui o resumo atual', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  let resolveFirst!: (value: DashboardSummary) => void;
  vi.mocked(getDashboardSummary).mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
    .mockResolvedValueOnce({ activePatientsCount: 8 } as DashboardSummary);
  vi.mocked(getSystemSettings).mockResolvedValue({ nomeEmpresa: 'Clínica atual' } as Awaited<ReturnType<typeof getSystemSettings>>);
  const first = { ...mockSession(), token: 'clinic-a' }; const second = { ...first, token: 'clinic-b' };
  const { result, rerender, unmount } = renderHook(({ session }) => useAppChrome({ session }), { wrapper, initialProps: { session: first } });
  rerender({ session: second });
  await waitFor(() => expect(result.current.dashboardSummary?.activePatientsCount).toBe(8));
  await act(async () => resolveFirst({ activePatientsCount: 999 } as DashboardSummary));
  expect(result.current.dashboardSummary?.activePatientsCount).toBe(8);
  unmount(); client.clear();
});
