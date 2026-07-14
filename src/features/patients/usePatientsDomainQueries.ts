import { useEffect, useMemo } from 'react';
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
import { queryClient } from '../../queryClient';
import { CBHPM_PAGE_SIZE, getErrorMessage, PAGE_SIZE } from '../../shared/utils/formatters';
import {
  getPagedItems,
  getPagedTotal,
  getPagedTotalPages,
  sortConveniosByDescription,
  sortOpmeFornecedoresByName,
  sortPacientesForListing,
  sortUsersByName,
} from '../../shared/utils/listing';
import { queryKeys } from '../../shared/queryKeys';
import type { AuthSession, CbhpmListQuery, MedicalUserOption } from '../../types';
import {
  areCbhpmFiltersSearchable,
  buildCbhpmQueryFilters,
  getCbhpmFilterValidationMessage,
} from './cbhpmLookupUtils';
import { getPacienteFilterQuery } from './patientUtils';
import { LIST_CACHE_TIME_MS, LOOKUP_CACHE_TIME_MS } from './patientDomainHelpers';
import type { useCbhpmLookup } from './useCbhpmLookup';
import type { usePatientList } from './usePatientList';
import type { usePatientLookups } from './usePatientLookups';

type UsePatientsDomainQueriesOptions = {
  session: AuthSession | null;
  activeView: AppView;
  moduleMode: ModuleMode;
  isAdmin: boolean;
  canAccessPatients: boolean;
  canConsultCbhpm: boolean;
  patientReadOnly: boolean;
  patientList: ReturnType<typeof usePatientList>;
  patientLookups: ReturnType<typeof usePatientLookups>;
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
  patientLookups,
  cbhpmLookup,
}: UsePatientsDomainQueriesOptions) {
  const {
    setPacientes,
    setPacientesLoading,
    setPacientesError,
    debouncedPacienteSearchTerm,
    debouncedPacienteFilters,
    pacienteCurrentPage,
    sortBy,
    sortDirection,
    setPacientesTotalItems,
    setPacientesTotalPages,
  } = patientList;
  const {
    setMedicalUsers,
    setHospitais,
    setHospitaisError,
    setConvenios,
    setConveniosError,
    setOpmeFornecedores,
    setOpmeFornecedoresError,
  } = patientLookups;
  const {
    cbhpmModalOpen,
    setCbhpmItems,
    cbhpmFilters,
    appliedCbhpmFilters,
    cbhpmCurrentPage,
    sortBy: cbhpmSortBy,
    sortDirection: cbhpmSortDirection,
    setCbhpmTotalItems,
    setCbhpmTotalPages,
    setCbhpmLoading,
    setCbhpmError,
  } = cbhpmLookup;

  const pacientesQueryParams = useMemo(() => ({
    page: pacienteCurrentPage,
    pageSize: PAGE_SIZE,
    search: debouncedPacienteSearchTerm,
    ...getPacienteFilterQuery(debouncedPacienteFilters, isAdmin),
    sortBy,
    sortDirection,
  }), [debouncedPacienteFilters, debouncedPacienteSearchTerm, isAdmin, pacienteCurrentPage, sortBy, sortDirection]);
  const sessionReady = Boolean(session && !session.user.precisaTrocarSenha);
  const pacientesQuery = useQuery({
    queryKey: queryKeys.pacientes(session?.token ?? '', pacientesQueryParams),
    queryFn: () => getPacientes(session?.token ?? '', pacientesQueryParams),
    enabled: sessionReady
      && canAccessPatients
      && moduleMode === 'list'
      && (activeView === 'patients' || activeView === 'dashboard'),
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
  const canSearchCbhpm = useMemo(
    () => areCbhpmFiltersSearchable(cbhpmFilters),
    [cbhpmFilters],
  );
  const cbhpmQueryParams = useMemo<CbhpmListQuery>(() => ({
    page: cbhpmCurrentPage,
    pageSize: CBHPM_PAGE_SIZE,
    ...buildCbhpmQueryFilters(appliedCbhpmFilters),
    sortBy: cbhpmSortBy,
    sortDirection: cbhpmSortDirection,
  }), [appliedCbhpmFilters, cbhpmCurrentPage, cbhpmSortBy, cbhpmSortDirection]);
  const cbhpmQuery = useQuery({
    queryKey: queryKeys.cbhpm(session?.token ?? '', cbhpmQueryParams),
    queryFn: () => getCbhpmGeral(session?.token ?? '', cbhpmQueryParams),
    enabled: sessionReady && canConsultCbhpm && cbhpmModalOpen && !appliedCbhpmFilterValidationMessage,
    staleTime: LIST_CACHE_TIME_MS,
  });

  useEffect(() => {
    setPacientesLoading(pacientesQuery.isFetching);
  }, [pacientesQuery.isFetching, setPacientesLoading]);

  useEffect(() => {
    if (!pacientesQuery.data) {
      return;
    }

    setPacientes(sortPacientesForListing(getPagedItems(pacientesQuery.data)));
    setPacientesTotalItems(getPagedTotal(pacientesQuery.data));
    setPacientesTotalPages(getPagedTotalPages(pacientesQuery.data));
    setPacientesError('');
  }, [pacientesQuery.data, setPacientes, setPacientesError, setPacientesTotalItems, setPacientesTotalPages]);

  useEffect(() => {
    if (pacientesQuery.error) {
      setPacientesError(getErrorMessage(pacientesQuery.error));
    }
  }, [pacientesQuery.error, setPacientesError]);

  useEffect(() => {
    if (medicalUsersQuery.data) {
      setMedicalUsers(sortUsersByName(getPagedItems(medicalUsersQuery.data as MedicalUserOption[])));
    }
  }, [medicalUsersQuery.data, setMedicalUsers]);

  useEffect(() => {
    if (medicalUsersQuery.error) {
      setPacientesError(getErrorMessage(medicalUsersQuery.error));
    }
  }, [medicalUsersQuery.error, setPacientesError]);

  useEffect(() => {
    if (hospitaisQuery.data) {
      setHospitais(hospitaisQuery.data);
      setHospitaisError('');
    }
  }, [hospitaisQuery.data, setHospitais, setHospitaisError]);

  useEffect(() => {
    if (hospitaisQuery.error) {
      setHospitaisError(getErrorMessage(hospitaisQuery.error));
    }
  }, [hospitaisQuery.error, setHospitaisError]);

  useEffect(() => {
    if (conveniosQuery.data) {
      setConvenios(sortConveniosByDescription(conveniosQuery.data));
      setConveniosError('');
    }
  }, [conveniosQuery.data, setConvenios, setConveniosError]);

  useEffect(() => {
    if (conveniosQuery.error) {
      setConveniosError(getErrorMessage(conveniosQuery.error));
    }
  }, [conveniosQuery.error, setConveniosError]);

  useEffect(() => {
    if (opmeFornecedoresQuery.data) {
      setOpmeFornecedores(sortOpmeFornecedoresByName(opmeFornecedoresQuery.data));
      setOpmeFornecedoresError('');
    }
  }, [opmeFornecedoresQuery.data, setOpmeFornecedores, setOpmeFornecedoresError]);

  useEffect(() => {
    if (opmeFornecedoresQuery.error) {
      setOpmeFornecedoresError(getErrorMessage(opmeFornecedoresQuery.error));
    }
  }, [opmeFornecedoresQuery.error, setOpmeFornecedoresError]);

  useEffect(() => {
    setCbhpmLoading(cbhpmQuery.isFetching);
  }, [cbhpmQuery.isFetching, setCbhpmLoading]);

  useEffect(() => {
    if (!cbhpmModalOpen || appliedCbhpmFilterValidationMessage) {
      return;
    }

    setCbhpmError('');
  }, [appliedCbhpmFilterValidationMessage, cbhpmModalOpen, setCbhpmError]);

  useEffect(() => {
    if (!cbhpmModalOpen || !appliedCbhpmFilterValidationMessage) {
      return;
    }

    setCbhpmItems([]);
    setCbhpmTotalItems(0);
    setCbhpmTotalPages(1);
    setCbhpmError(appliedCbhpmFilterValidationMessage);
  }, [
    appliedCbhpmFilterValidationMessage,
    cbhpmModalOpen,
    setCbhpmError,
    setCbhpmItems,
    setCbhpmTotalItems,
    setCbhpmTotalPages,
  ]);

  useEffect(() => {
    if (!cbhpmModalOpen || !cbhpmQuery.data || appliedCbhpmFilterValidationMessage) {
      return;
    }

    setCbhpmItems(getPagedItems(cbhpmQuery.data));
    setCbhpmTotalItems(getPagedTotal(cbhpmQuery.data));
    setCbhpmTotalPages(getPagedTotalPages(cbhpmQuery.data));
    setCbhpmError('');
  }, [
    appliedCbhpmFilterValidationMessage,
    cbhpmModalOpen,
    cbhpmQuery.data,
    setCbhpmError,
    setCbhpmItems,
    setCbhpmTotalItems,
    setCbhpmTotalPages,
  ]);

  useEffect(() => {
    if (cbhpmQuery.error) {
      setCbhpmError(getErrorMessage(cbhpmQuery.error));
    }
  }, [cbhpmQuery.error, setCbhpmError]);

  const loadMedicalUsers = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.medicalUsers(token) });
    }

    await medicalUsersQuery.refetch();
  };

  const loadPacientes = async (
    token = session?.token,
    forceRefresh = false,
  ) => {
    if (!token || !canAccessPatients) {
      return;
    }

    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.pacientesRoot(token) });
    }

    await pacientesQuery.refetch();
  };

  const loadCbhpm = async (
    token = session?.token,
    forceRefresh = false,
  ) => {
    if (!token || !canConsultCbhpm) {
      return;
    }

    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cbhpmRoot(token) });
    }

    await cbhpmQuery.refetch();
  };

  const loadHospitais = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.hospitais(token) });
    }

    await hospitaisQuery.refetch();
  };

  const loadConvenios = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.convenios(token) });
    }

    await conveniosQuery.refetch();
  };

  const loadOpmeFornecedores = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.opmeFornecedores(token) });
    }

    await opmeFornecedoresQuery.refetch();
  };

  return {
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
