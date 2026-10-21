import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { queryClient } from '../../queryClient';
import { queryKeys } from '../../shared/queryKeys';
import { basePaciente, mockSession, paged } from '../../test/appTestData';
import * as api from '../../services';
import { usePatientList } from './usePatientList';
import { usePatientLookups } from './usePatientLookups';
import { useCbhpmLookup } from './useCbhpmLookup';
import { usePatientsDomainQueries } from './usePatientsDomainQueries';
import { usePatientCrudActions } from './usePatientCrudActions';
import { usePatientForm } from './usePatientForm';
import { useAppChrome } from '../../app/useAppChrome';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';

vi.mock('../../services', () => ({
  getPacientes: vi.fn(), getScopedMedicalUsers: vi.fn(), getHospitais: vi.fn(),
  getConvenios: vi.fn(), getOpmeFornecedores: vi.fn(), getCbhpmGeral: vi.fn(),
  deletePaciente: vi.fn(), getDashboardSummary: vi.fn(), getSystemSettings: vi.fn(), DEFAULT_SYSTEM_SETTINGS: {},
}));

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
const session = mockSession();
beforeEach(() => {
  queryClient.clear();
  vi.mocked(api.getPacientes).mockResolvedValue(paged([]));
  vi.mocked(api.getScopedMedicalUsers).mockResolvedValue([]);
  vi.mocked(api.getHospitais).mockResolvedValue([]);
  vi.mocked(api.getConvenios).mockResolvedValue([]);
  vi.mocked(api.getOpmeFornecedores).mockResolvedValue([]);
  vi.mocked(api.getCbhpmGeral).mockResolvedValue(paged([]));
});

it('refreshes the open CBHPM lookup once and invalidates inactive results', async () => {
  const { result } = renderHook(() => usePatientsDomainQueries({
    session, activeView: 'patients', moduleMode: 'list', canAccessPatients: true,
    canConsultCbhpm: true, patientReadOnly: false, patientList: usePatientList(), patientLookups: usePatientLookups(),
    cbhpmLookup: { ...useCbhpmLookup(), cbhpmModalOpen: true },
  }), { wrapper });
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  expect(api.getCbhpmGeral).toHaveBeenCalledTimes(1);
  const inactive = queryKeys.cbhpm(session.token, { page: 2, pageSize: 10 });
  const other = queryKeys.cbhpm('other-clinic', { page: 2, pageSize: 10 });
  queryClient.setQueryData(inactive, paged([])); queryClient.setQueryData(other, paged([]));
  await act(async () => { await result.current.loadCbhpm(session.token, true); });
  expect(api.getCbhpmGeral).toHaveBeenCalledTimes(2);
  expect(queryClient.getQueryState(inactive)?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(other)?.isInvalidated).toBe(false);
});

it('does not request patients or CBHPM from guarded loaders without permission', async () => {
  const { result } = renderHook(() => usePatientsDomainQueries({
    session, activeView: 'patients', moduleMode: 'list', canAccessPatients: false,
    canConsultCbhpm: false, patientReadOnly: true, patientList: usePatientList(), patientLookups: usePatientLookups(),
    cbhpmLookup: useCbhpmLookup(),
  }), { wrapper });
  await act(async () => { await result.current.loadPacientes(session.token, true); await result.current.loadCbhpm(session.token, true); });
  expect(api.getPacientes).not.toHaveBeenCalled();
  expect(api.getCbhpmGeral).not.toHaveBeenCalled();
});

it.each([true, false])('patient deletion refreshes once only when permitted (%s)', async canDeletePatients => {
  const confirmAction = vi.fn<ConfirmAction>();
  vi.mocked(api.deletePaciente).mockResolvedValue(undefined);
  vi.mocked(api.getDashboardSummary).mockResolvedValue({ pacientesCount: 1 } as Awaited<ReturnType<typeof api.getDashboardSummary>>);
  vi.mocked(api.getSystemSettings).mockResolvedValue({ nomeEmpresa: 'Audit' } as Awaited<ReturnType<typeof api.getSystemSettings>>);
  const { result } = renderHook(() => {
    const patientList = usePatientList();
    const patientLookups = usePatientLookups();
    const queries = usePatientsDomainQueries({ session, activeView: 'patients', moduleMode: 'list',
      canAccessPatients: true, canConsultCbhpm: false, patientReadOnly: false,
      patientList, patientLookups, cbhpmLookup: useCbhpmLookup() });
    const chrome = useAppChrome({ session });
    return usePatientCrudActions({ session, canCreatePatients: true, canEditPatients: true, canDeletePatients,
      patientList, patientLookups, patientForm: usePatientForm(patientList.pacientes),
      setModuleMode: vi.fn(), navigateToPatients: vi.fn(), loadPacientes: queries.loadPacientes,
      loadDashboardSummary: chrome.loadDashboardSummary, confirmAction });
  }, { wrapper });
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  expect(api.getPacientes).toHaveBeenCalledTimes(1);
  expect(api.getDashboardSummary).toHaveBeenCalledTimes(1);
  act(() => result.current.handleDeletePaciente(basePaciente));
  await act(async () => { await confirmAction.mock.calls[0][0].onConfirm(); });
  expect(api.deletePaciente).toHaveBeenCalledTimes(canDeletePatients ? 1 : 0);
  expect(api.getPacientes).toHaveBeenCalledTimes(canDeletePatients ? 2 : 1);
  expect(api.getDashboardSummary).toHaveBeenCalledTimes(canDeletePatients ? 2 : 1);
});
afterEach(() => { queryClient.clear(); vi.clearAllMocks(); });

it.each([
  ['loadPacientes', 'getPacientes'],
  ['loadMedicalUsers', 'getScopedMedicalUsers'],
  ['loadHospitais', 'getHospitais'],
  ['loadConvenios', 'getConvenios'],
  ['loadOpmeFornecedores', 'getOpmeFornecedores'],
] as const)('%s performs exactly one request per forced refresh', async (loader, service) => {
  const { result } = renderHook(() => usePatientsDomainQueries({
    session, activeView: 'patients', moduleMode: 'list',
    canAccessPatients: true, canConsultCbhpm: true, patientReadOnly: false,
    patientList: usePatientList(), patientLookups: usePatientLookups(), cbhpmLookup: useCbhpmLookup(),
  }), { wrapper });
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  expect(api[service]).toHaveBeenCalledTimes(1);
  const anotherClinic = queryKeys.pacientes('other-clinic', { page: 1, pageSize: 10 });
  queryClient.setQueryData(anotherClinic, paged([]));
  await act(async () => { await result.current[loader](session.token, true); });
  expect(api[service]).toHaveBeenCalledTimes(2);
  expect(queryClient.getQueryState(anotherClinic)?.isInvalidated).toBe(false);
});
