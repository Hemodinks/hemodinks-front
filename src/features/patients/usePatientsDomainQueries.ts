import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getCbhpmGeral,
  getConvenios,
  getHospitais,
  getOpmeFornecedores,
  getPacientes,
  getScopedMedicalUsers,
} from '../../services';
import type { AppView, ModuleMode } from '../../appTypes';
import { CBHPM_PAGE_SIZE, getErrorMessage, PAGE_SIZE } from '../../shared/utils/formatters';
import { queryKeys } from '../../shared/queryKeys';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import type { CbhpmListQuery } from './patientTypes';
import {
  areCbhpmFiltersSearchable,
  buildCbhpmQueryFilters,
  getCbhpmFilterValidationMessage,
} from './cbhpmLookupUtils';
import { getPacienteFilterQuery } from './patientUtils';
import { LIST_CACHE_TIME_MS, LOOKUP_CACHE_TIME_MS } from './patientDomainHelpers';
import type { useCbhpmLookup } from './useCbhpmLookup';
import type { usePatientList } from './usePatientList';
import {
  refreshPatientQuery,
  selectCbhpmPage,
  selectConvenios,
  selectHospitais,
  selectMedicalUsers,
  selectOpmeFornecedores,
  selectPatientPage,
} from './patientQueryResults';

type UsePatientsDomainQueriesOptions = {
  session: AuthSession | null;
  activeView: AppView;
  moduleMode: ModuleMode;
  isAdmin: boolean;
  canAccessPatients: boolean;
  canConsultCbhpm: boolean;
  patientReadOnly: boolean;
  patientList: ReturnType<typeof usePatientList>;
  cbhpmLookup: ReturnType<typeof useCbhpmLookup>;
};

export function usePatientsDomainQueries({
  session,
  activeView,
  moduleMode,
  isAdmin,
  canAccessPatients,
  canConsultCbhpm,
  patientReadOnly,
  patientList,
  cbhpmLookup,
}: UsePatientsDomainQueriesOptions) {
  const {
    debouncedPacienteSearchTerm,
    debouncedPacienteFilters,
    pacienteCurrentPage,
    sortBy,
    sortDirection,
  } = patientList;
  const {
    cbhpmModalOpen,
    cbhpmFilters,
    appliedCbhpmFilters,
    cbhpmCurrentPage,
    sortBy: cbhpmSortBy,
    sortDirection: cbhpmSortDirection,
  } = cbhpmLookup;

  const pacientesQueryParams = useMemo(
    () => ({
      page: pacienteCurrentPage,
      pageSize: PAGE_SIZE,
      search: debouncedPacienteSearchTerm,
      ...getPacienteFilterQuery(debouncedPacienteFilters, isAdmin),
      sortBy,
      sortDirection,
    }),
    [
      debouncedPacienteFilters,
      debouncedPacienteSearchTerm,
      isAdmin,
      pacienteCurrentPage,
      sortBy,
      sortDirection,
    ],
  );
  const sessionReady = Boolean(session && !session.user.precisaTrocarSenha);
  const pacientesQuery = useQuery({
    queryKey: queryKeys.pacientes(session?.token ?? '', pacientesQueryParams),
    queryFn: () => getPacientes(session?.token ?? '', pacientesQueryParams),
    enabled:
      sessionReady &&
      canAccessPatients &&
      moduleMode === 'list' &&
      (activeView === 'patients' || activeView === 'dashboard'),
    staleTime: LIST_CACHE_TIME_MS,
  });
  const medicalUsersQuery = useQuery({
    queryKey: queryKeys.medicalUsers(session?.token ?? ''),
    queryFn: () => getScopedMedicalUsers(session?.token ?? ''),
    enabled: sessionReady && canAccessPatients && activeView === 'patients' && !patientReadOnly,
    staleTime: LOOKUP_CACHE_TIME_MS,
  });
  const hospitaisQuery = useQuery({
    queryKey: queryKeys.hospitais(session?.token ?? ''),
    queryFn: () => getHospitais(session?.token ?? ''),
    enabled: sessionReady,
    staleTime: LOOKUP_CACHE_TIME_MS,
  });
  const conveniosQuery = useQuery({
    queryKey: queryKeys.convenios(session?.token ?? ''),
    queryFn: () => getConvenios(session?.token ?? ''),
    enabled: sessionReady,
    staleTime: LOOKUP_CACHE_TIME_MS,
  });
  const opmeFornecedoresQuery = useQuery({
    queryKey: queryKeys.opmeFornecedores(session?.token ?? ''),
    queryFn: () => getOpmeFornecedores(session?.token ?? ''),
    enabled: sessionReady,
    staleTime: LOOKUP_CACHE_TIME_MS,
  });
  const appliedCbhpmFilterValidationMessage = useMemo(
    () => getCbhpmFilterValidationMessage(appliedCbhpmFilters),
    [appliedCbhpmFilters],
  );
  const cbhpmFilterHint = useMemo(
    () => getCbhpmFilterValidationMessage(cbhpmFilters),
    [cbhpmFilters],
  );
  const canSearchCbhpm = useMemo(() => areCbhpmFiltersSearchable(cbhpmFilters), [cbhpmFilters]);
  const cbhpmQueryParams = useMemo<CbhpmListQuery>(
    () => ({
      page: cbhpmCurrentPage,
      pageSize: CBHPM_PAGE_SIZE,
      ...buildCbhpmQueryFilters(appliedCbhpmFilters),
      sortBy: cbhpmSortBy,
      sortDirection: cbhpmSortDirection,
    }),
    [appliedCbhpmFilters, cbhpmCurrentPage, cbhpmSortBy, cbhpmSortDirection],
  );
  const cbhpmQuery = useQuery({
    queryKey: queryKeys.cbhpm(session?.token ?? '', cbhpmQueryParams),
    queryFn: () => getCbhpmGeral(session?.token ?? '', cbhpmQueryParams),
    enabled:
      sessionReady && canConsultCbhpm && cbhpmModalOpen && !appliedCbhpmFilterValidationMessage,
    staleTime: LIST_CACHE_TIME_MS,
  });

  const patientPage = useMemo(() => selectPatientPage(pacientesQuery.data), [pacientesQuery.data]);
  const medicalUsers = useMemo(
    () => selectMedicalUsers(medicalUsersQuery.data),
    [medicalUsersQuery.data],
  );
  const convenios = useMemo(() => selectConvenios(conveniosQuery.data), [conveniosQuery.data]);
  const opmeFornecedores = useMemo(
    () => selectOpmeFornecedores(opmeFornecedoresQuery.data),
    [opmeFornecedoresQuery.data],
  );
  const cbhpmData =
    cbhpmModalOpen && !appliedCbhpmFilterValidationMessage ? cbhpmQuery.data : undefined;
  const cbhpmPage = useMemo(() => selectCbhpmPage(cbhpmData), [cbhpmData]);

  const loadMedicalUsers = async (token = session?.token, forceRefresh = false) => {
    await refreshPatientQuery(token, forceRefresh, queryKeys.medicalUsers(token ?? ''), () =>
      medicalUsersQuery.refetch(),
    );
  };

  const loadPacientes = async (token = session?.token, forceRefresh = false) => {
    await refreshPatientQuery(
      token,
      forceRefresh,
      queryKeys.pacientesRoot(token ?? ''),
      () => pacientesQuery.refetch(),
      canAccessPatients,
    );
  };

  const loadCbhpm = async (token = session?.token, forceRefresh = false) => {
    await refreshPatientQuery(
      token,
      forceRefresh,
      queryKeys.cbhpmRoot(token ?? ''),
      () => cbhpmQuery.refetch(),
      canConsultCbhpm,
    );
  };

  const loadHospitais = async (token = session?.token, forceRefresh = false) => {
    await refreshPatientQuery(token, forceRefresh, queryKeys.hospitais(token ?? ''), () =>
      hospitaisQuery.refetch(),
    );
  };

  const loadConvenios = async (token = session?.token, forceRefresh = false) => {
    await refreshPatientQuery(token, forceRefresh, queryKeys.convenios(token ?? ''), () =>
      conveniosQuery.refetch(),
    );
  };

  const loadOpmeFornecedores = async (token = session?.token, forceRefresh = false) => {
    await refreshPatientQuery(token, forceRefresh, queryKeys.opmeFornecedores(token ?? ''), () =>
      opmeFornecedoresQuery.refetch(),
    );
  };

  return {
    pacientes: patientPage.items,
    pacientesError:
      pacientesQuery.error || medicalUsersQuery.error
        ? getErrorMessage(pacientesQuery.error ?? medicalUsersQuery.error)
        : '',
    pacientesTotalItems: patientPage.totalItems,
    pacientesTotalPages: patientPage.totalPages,
    medicalUsers,
    hospitais: selectHospitais(hospitaisQuery.data),
    hospitaisError: hospitaisQuery.error ? getErrorMessage(hospitaisQuery.error) : '',
    convenios,
    conveniosError: conveniosQuery.error ? getErrorMessage(conveniosQuery.error) : '',
    opmeFornecedores,
    opmeFornecedoresError: opmeFornecedoresQuery.error
      ? getErrorMessage(opmeFornecedoresQuery.error)
      : '',
    cbhpmItems: cbhpmPage.items,
    cbhpmError:
      appliedCbhpmFilterValidationMessage ||
      (cbhpmQuery.error ? getErrorMessage(cbhpmQuery.error) : ''),
    cbhpmTotalItems: cbhpmPage.totalItems,
    cbhpmTotalPages: cbhpmPage.totalPages,
    pacientesLoading: pacientesQuery.isFetching,
    cbhpmLoading: cbhpmQuery.isFetching,
    cbhpmFilterHint,
    canSearchCbhpm,
    loadMedicalUsers,
    loadPacientes,
    loadCbhpm,
    loadHospitais,
    loadConvenios,
    loadOpmeFornecedores,
  };
}
