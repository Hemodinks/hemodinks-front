import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { queryClient } from '../../queryClient';
import { mockSession, paged } from '../../test/appTestData';
import * as api from '../../services';
import type { AppView, ModuleMode } from '../../appTypes';
import { useMedicalGroupsDomain } from './useMedicalGroupsDomain';

vi.mock('../../services', () => ({
  getMedicalGroups: vi.fn(), getMedicalGroup: vi.fn(), getScopedMedicalUsers: vi.fn(),
  createMedicalGroup: vi.fn(), updateMedicalGroup: vi.fn(), deleteMedicalGroup: vi.fn(),
}));

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
const session = mockSession();
const render = (activeView: AppView, moduleMode: ModuleMode, canAccessMedicalGroups = true) => renderHook(() => useMedicalGroupsDomain({
  session, activeView, moduleMode, canAccessMedicalGroups,
  formRecordId: null, navigateToForm: vi.fn(), navigateToView: vi.fn(), confirmAction: vi.fn(),
}), { wrapper });

beforeEach(() => {
  queryClient.clear();
  vi.mocked(api.getMedicalGroups).mockResolvedValue(paged([]));
  vi.mocked(api.getScopedMedicalUsers).mockResolvedValue([]);
});
afterEach(() => { queryClient.clear(); vi.clearAllMocks(); });

it.each([
  ['dashboard', 'list'],
  ['medicalGroups', 'list'],
] as const)('does not load the medical users lookup outside the group form (%s/%s)', async (view, mode) => {
  render(view, mode);
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  expect(api.getScopedMedicalUsers).not.toHaveBeenCalled();
});

it('loads the medical users lookup once on the group form', async () => {
  render('medicalGroups', 'form');
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  expect(api.getScopedMedicalUsers).toHaveBeenCalledTimes(1);
});

it('keeps only the sidebar count request on login', async () => {
  render('dashboard', 'list');
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  expect(api.getMedicalGroups).toHaveBeenCalledTimes(1);
  expect(api.getScopedMedicalUsers).not.toHaveBeenCalled();
});

it('skips every medical group request without access', async () => {
  render('medicalGroups', 'form', false);
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  expect(api.getMedicalGroups).not.toHaveBeenCalled();
  expect(api.getScopedMedicalUsers).not.toHaveBeenCalled();
});
