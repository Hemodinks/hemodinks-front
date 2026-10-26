import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { queryClient } from '../../queryClient';
import { queryKeys } from '../../shared/queryKeys';
import { baseUser, mockSession, paged } from '../../test/appTestData';
import { deleteUser, getUsers, getDashboardSummary, getSystemSettings } from '../../services';
import { useUsersDomain } from './useUsersDomain';
import { useAppChrome } from '../../app/useAppChrome';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';

vi.mock('../../services', () => ({ getUsers: vi.fn(), deleteUser: vi.fn(),
  getDashboardSummary: vi.fn(), getSystemSettings: vi.fn(), DEFAULT_SYSTEM_SETTINGS: {} }));
afterEach(() => { queryClient.clear(); vi.clearAllMocks(); });

it.each([
  { canAccessUsers: false, precisaTrocarSenha: false },
  { canAccessUsers: true, precisaTrocarSenha: true },
])('does not manually request a disabled user list (%j)', async ({ canAccessUsers, precisaTrocarSenha }) => {
  const session = mockSession();
  session.user.precisaTrocarSenha = precisaTrocarSenha;
  vi.mocked(getUsers).mockResolvedValue(paged([]));
  const { result } = renderHook(() => useUsersDomain({
    session, activeView: 'users', moduleMode: 'list', canAccessUsers,
    canEditOwnUser: true, isAdmin: false, setModuleMode: vi.fn(), navigateToView: vi.fn(),
    persistSession: vi.fn(), loadDashboardSummary: vi.fn(), onDeleteCurrentUser: vi.fn(),
    onIdentityChanged: vi.fn(), confirmAction: vi.fn(),
  }), { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider> });
  const inactivePage = queryKeys.users(session.token, { page: 2, pageSize: 10, search: '' });
  queryClient.setQueryData(inactivePage, paged([]));
  await act(async () => { result.current.refreshUsers(); });
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  expect(getUsers).not.toHaveBeenCalled();
  expect(queryClient.getQueryState(inactivePage)?.isInvalidated).toBe(false);
});

it('refreshes the active user list once, invalidates inactive pages and preserves another clinic', async () => {
  const session = mockSession();
  vi.mocked(getUsers).mockResolvedValue(paged([]));
  const { result } = renderHook(() => useUsersDomain({
    session, activeView: 'users', moduleMode: 'list', canAccessUsers: true,
    canEditOwnUser: true, isAdmin: true, setModuleMode: vi.fn(), navigateToView: vi.fn(),
    persistSession: vi.fn(), loadDashboardSummary: vi.fn(), onDeleteCurrentUser: vi.fn(),
    onIdentityChanged: vi.fn(), confirmAction: vi.fn(),
  }), { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider> });
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  expect(getUsers).toHaveBeenCalledTimes(1);
  const inactivePage = queryKeys.users(session.token, { page: 2, pageSize: 10, search: '' });
  const anotherClinic = queryKeys.users('other-clinic', { page: 1, pageSize: 10, search: '' });
  queryClient.setQueryData(inactivePage, paged([]));
  queryClient.setQueryData(anotherClinic, paged([]));
  act(() => result.current.refreshUsers());
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  expect(getUsers).toHaveBeenCalledTimes(2);
  expect(queryClient.getQueryState(inactivePage)?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(anotherClinic)?.isInvalidated).toBe(false);
});

it('deleting a user refreshes list and summary once each', async () => {
  const session = mockSession();
  const confirmAction = vi.fn<ConfirmAction>();
  vi.mocked(getUsers).mockResolvedValue(paged([baseUser]));
  vi.mocked(deleteUser).mockResolvedValue(undefined);
  vi.mocked(getDashboardSummary).mockResolvedValue({ usersCount: 1 } as Awaited<ReturnType<typeof getDashboardSummary>>);
  vi.mocked(getSystemSettings).mockResolvedValue({ nomeEmpresa: 'Audit' } as Awaited<ReturnType<typeof getSystemSettings>>);
  const { result } = renderHook(() => {
    const chrome = useAppChrome({ session });
    return useUsersDomain({
      session, activeView: 'users', moduleMode: 'list', canAccessUsers: true,
      canEditOwnUser: true, isAdmin: true, setModuleMode: vi.fn(), navigateToView: vi.fn(),
      persistSession: vi.fn(), loadDashboardSummary: chrome.loadDashboardSummary,
      onDeleteCurrentUser: vi.fn(), onIdentityChanged: vi.fn(), confirmAction,
    });
  }, { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider> });
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  expect(getUsers).toHaveBeenCalledTimes(1);
  expect(getDashboardSummary).toHaveBeenCalledTimes(1);
  act(() => result.current.handleDeleteUser(baseUser));
  await act(async () => { await confirmAction.mock.calls[0][0].onConfirm(); });
  expect(deleteUser).toHaveBeenCalledTimes(1);
  expect(getUsers).toHaveBeenCalledTimes(2);
  expect(getDashboardSummary).toHaveBeenCalledTimes(2);
});
