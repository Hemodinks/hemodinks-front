import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createPaciente,
  createPacienteObservacao,
  deletePaciente,
  deletePacienteArquivo,
  getCbhpmGeral,
  getConvenios,
  getHospitais,
  getOpmeFornecedores,
  getPaciente,
  getPacientes,
  getScopedMedicalUsers,
  updatePaciente,
  uploadPacienteArquivo,
} from '../../services';
import type {
  AppView,
  ModuleMode,
} from '../../appTypes';
import { queryClient } from '../../queryClient';
import {
  ALLOWED_PATIENT_FILE_TYPES,
  CBHPM_PAGE_SIZE,
  DEFAULT_PASSWORD,
  findConvenioByDescription,
  findHospitalByName,
  findMedicalUserByName,
  findOpmeFornecedorByName,
  getErrorMessage,
  MAX_PATIENT_FILE_BYTES,
  PAGE_SIZE,
} from '../../shared/utils/formatters';
import {
  getPagedItems,
  getPagedTotal,
  getPagedTotalPages,
  sortConveniosByDescription,
  sortOpmeFornecedoresByName,
  sortPacientesForListing,
  sortUsersByName,
} from '../../shared/utils/listing';
import type {
  AuthSession,
  CbhpmListQuery,
  CbhpmGeral,
  MedicalUserOption,
  Paciente,
} from '../../types';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import { queryKeys } from '../../shared/queryKeys';
import {
  areCbhpmFiltersSearchable,
  buildCbhpmQueryFilters,
  getCbhpmFilterValidationMessage,
} from './cbhpmLookupUtils';
import {
  emptyPacienteFilters,
  getPacienteFilterQuery,
  normalizePacienteProcedimentos,
  toPacientePayload,
  validatePacienteForm,
  withPrimaryProcedimento,
} from './patientUtils';
import { useCbhpmLookup } from './useCbhpmLookup';
import { usePatientExport } from './usePatientExport';
import { usePatientForm } from './usePatientForm';
import { usePatientList } from './usePatientList';
import { usePatientLookups } from './usePatientLookups';
import { usePatientObservacoes } from './usePatientObservacoes';

const LIST_CACHE_TIME_MS = 20 * 1000;
const LOOKUP_CACHE_TIME_MS = 30 * 60 * 1000;

type UsePatientsDomainOptions = {
  session: AuthSession | null;
  activeView: AppView;
  moduleMode: ModuleMode;
  companyName: string;
  isAdmin: boolean;
  isMedical: boolean;
  canAccessPatients: boolean;
  canCreatePatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  canConsultCbhpm: boolean;
  patientReadOnly: boolean;
  setModuleMode: Dispatch<SetStateAction<ModuleMode>>;
  navigateToView: (view: AppView, replace?: boolean) => void;
  loadDashboardSummary: (token?: string, forceRefresh?: boolean) => Promise<void>;
  confirmAction: ConfirmAction;
};

export function usePatientsDomain({
  session,
  activeView,
  moduleMode,
  companyName,
  isAdmin,
  isMedical,
  canAccessPatients,
  canCreatePatients,
  canEditPatients,
  canDeletePatients,
  canConsultCbhpm,
  patientReadOnly,
  setModuleMode,
  navigateToView,
  loadDashboardSummary,
  confirmAction,
}: UsePatientsDomainOptions) {
  const patientList = usePatientList();
  const patientForm = usePatientForm(patientList.pacientes);
  const patientLookups = usePatientLookups();
  const cbhpmLookup = useCbhpmLookup();
  const [selectedPatientInfo, setSelectedPatientInfo] = useState<Paciente | null>(null);
  const [selectedPatientFiles, setSelectedPatientFiles] = useState<Paciente | null>(null);
  const [patientFilesModalLoading, setPatientFilesModalLoading] = useState(false);
  const [patientFilesModalError, setPatientFilesModalError] = useState('');

  const {
    pacientes,
    setPacientes,
    pacientesLoading,
    setPacientesLoading,
    pacientesError,
    setPacientesError,
    pacienteSuccessMessage,
    setPacienteSuccessMessage,
    pacienteSearchTerm,
    setPacienteSearchTerm,
    pacienteFilters,
    setPacienteFilters,
    debouncedPacienteSearchTerm,
    debouncedPacienteFilters,
    setDebouncedPacienteFilters,
    pacienteCurrentPage,
    setPacienteCurrentPage,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    pacientesTotalItems,
    setPacientesTotalItems,
    pacientesTotalPages,
    setPacientesTotalPages,
    pacienteTotalPages,
    paginatedPacientes,
    pacienteVisibleStart,
    pacienteVisibleEnd,
    resetPatientListState,
  } = patientList;
  const {
    pacienteFormData,
    setPacienteFormData,
    editingPacienteId,
    setEditingPacienteDetails,
    editingPaciente,
    pacienteFormLoading,
    setPacienteFormLoading,
    pacienteFormError,
    setPacienteFormError,
    patientFileInputKey,
    pendingPatientFiles,
    setPendingPatientFiles,
    resetPacienteForm,
    applyPacienteToForm,
  } = patientForm;
  const {
    medicalUsers,
    setMedicalUsers,
    hospitais,
    setHospitais,
    hospitaisError,
    setHospitaisError,
    convenios,
    setConvenios,
    conveniosError,
    setConveniosError,
    opmeFornecedores,
    setOpmeFornecedores,
    opmeFornecedoresError,
    setOpmeFornecedoresError,
    resetPatientLookups,
  } = patientLookups;
  const {
    cbhpmModalOpen,
    setCbhpmModalOpen,
    cbhpmItems,
    setCbhpmItems,
    cbhpmFilters,
    setCbhpmFilters,
    appliedCbhpmFilters,
    applyCbhpmFiltersNow,
    cbhpmCurrentPage,
    setCbhpmCurrentPage,
    sortBy: cbhpmSortBy,
    setSortBy: setCbhpmSortBy,
    sortDirection: cbhpmSortDirection,
    setSortDirection: setCbhpmSortDirection,
    cbhpmTotalItems,
    setCbhpmTotalItems,
    cbhpmTotalPageCount,
    setCbhpmTotalPages,
    cbhpmLoading,
    setCbhpmLoading,
    cbhpmError,
    setCbhpmError,
    cbhpmVisibleStart,
    cbhpmVisibleEnd,
    resetCbhpmLookup,
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
    enabled: sessionReady && canAccessPatients && activeView === 'patients' && moduleMode === 'list',
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
  const savePacienteMutation = useMutation({
    mutationFn: ({ id, payload, token }: { id: number | null; payload: ReturnType<typeof toPacientePayload>; token: string }) => (
      id ? updatePaciente(id, payload, token) : createPaciente(payload, token)
    ),
  });
  const deletePacienteMutation = useMutation({
    mutationFn: ({ id, token }: { id: number; token: string }) => deletePaciente(id, token),
  });
  const deletePacienteArquivoMutation = useMutation({
    mutationFn: ({ pacienteId, arquivoId, token }: { pacienteId: number; arquivoId: number; token: string }) => (
      deletePacienteArquivo(pacienteId, arquivoId, token)
    ),
  });
  const createPacienteObservacaoMutation = useMutation({
    mutationFn: ({ pacienteId, texto, observacaoPaiId, token }: { pacienteId: number; texto: string; observacaoPaiId?: number | null; token: string }) => (
      createPacienteObservacao(pacienteId, { texto, observacaoPaiId }, token)
    ),
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
  const patientExport = usePatientExport({
    session,
    companyName,
    paginatedPacientes,
    pacienteFilters,
    setPacientesError,
  });

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

  const patientObservacoesState = usePatientObservacoes({
    session,
    activeView,
    moduleMode,
    pacientes,
    editingPaciente,
    setPacientes,
    setEditingPacienteDetails,
    loadPacientes,
    loadDashboardSummary,
  });

  const resetPatientsState = () => {
    resetPatientListState();
    resetPatientLookups();
    setSelectedPatientInfo(null);
    setSelectedPatientFiles(null);
    patientObservacoesState.resetPatientObservacoesState();
    setPatientFilesModalError('');
    setPatientFilesModalLoading(false);
    resetCbhpmLookup();
    resetPacienteForm();
  };

  const handleEditPaciente = async (paciente: Paciente) => {
    if (!session) {
      return;
    }

    setPacienteFormError('');
    setPacienteSuccessMessage('');
    navigateToView('patients');
    setPendingPatientFiles([]);
    setPacienteFormLoading(true);

    try {
      const details = await getPaciente(paciente.id, session.token);
      applyPacienteToForm(details);
    } catch (error) {
      applyPacienteToForm(paciente);
      setPacienteFormError(getErrorMessage(error));
    } finally {
      setPacienteFormLoading(false);
      setModuleMode('form');
    }
  };

  const handlePacienteFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (patientReadOnly) {
      return;
    }

    if (!files.length) {
      return;
    }

    const invalidFile = files.find((file) => !ALLOWED_PATIENT_FILE_TYPES.has(file.type) || file.size > MAX_PATIENT_FILE_BYTES);

    if (invalidFile) {
      setPacienteFormError('Use PDF, DOC, DOCX, JPG, JPEG, PNG, XLS, XLSX, TXT, CSV, PPT ou PPTX de ate 10 MB.');
      return;
    }

    setPendingPatientFiles((current) => [...current, ...files]);
    setPacienteFormError('');
  };

  const removePendingPatientFile = (indexToRemove: number) => {
    setPendingPatientFiles((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const resolveMedicalSelection = (
    userId: number | null,
    nome: string,
  ) => {
    const trimmedName = nome.trim();
    const selectedUser = userId != null
      ? medicalUsers.find((user) => user.id === userId)
      : findMedicalUserByName(medicalUsers, trimmedName);

    return {
      selectedUser,
      trimmedName,
      hasScopedSelection: Boolean(trimmedName && userId != null && !selectedUser),
    };
  };

  const handleSubmitPaciente = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      return;
    }

    if (editingPacienteId && !canEditPatients) {
      setPacienteFormError('Sem permissao para editar pacientes.');
      return;
    }

    if (!editingPacienteId && !canCreatePatients) {
      setPacienteFormError('Sem permissao para cadastrar pacientes.');
      return;
    }

    const validationError = validatePacienteForm(pacienteFormData);

    if (validationError) {
      setPacienteFormError(validationError);
      return;
    }

    const selectedMedico = resolveMedicalSelection(
      pacienteFormData.medicoUserId,
      pacienteFormData.medico,
    );
    const selectedMedicoAuxiliar1 = resolveMedicalSelection(
      pacienteFormData.medicoAuxiliar1UserId,
      pacienteFormData.medicoAuxiliar1,
    );
    const selectedMedicoAuxiliar2 = resolveMedicalSelection(
      pacienteFormData.medicoAuxiliar2UserId,
      pacienteFormData.medicoAuxiliar2,
    );

    if (selectedMedico.trimmedName && !selectedMedico.selectedUser && !selectedMedico.hasScopedSelection) {
      setPacienteFormError('Selecione um cirurgião cadastrado com perfil Médicos.');
      return;
    }

    if (selectedMedicoAuxiliar1.trimmedName && !selectedMedicoAuxiliar1.selectedUser && !selectedMedicoAuxiliar1.hasScopedSelection) {
      setPacienteFormError('Selecione o médico auxiliar 1 no cadastro de médicos.');
      return;
    }

    if (selectedMedicoAuxiliar2.trimmedName && !selectedMedicoAuxiliar2.selectedUser && !selectedMedicoAuxiliar2.hasScopedSelection) {
      setPacienteFormError('Selecione o médico auxiliar 2 no cadastro de médicos.');
      return;
    }

    const selectedHospital = pacienteFormData.hospitalId != null
      ? hospitais.find((hospital) => hospital.id === pacienteFormData.hospitalId)
      : findHospitalByName(hospitais, pacienteFormData.hospital);
    const selectedConvenio = pacienteFormData.convenioId != null
      ? convenios.find((convenio) => convenio.idConvenio === pacienteFormData.convenioId)
      : findConvenioByDescription(convenios, pacienteFormData.convenio);
    const selectedOpmeFornecedor = pacienteFormData.opmeFornecedorId != null
      ? opmeFornecedores.find((fornecedor) => fornecedor.idFornecedor === pacienteFormData.opmeFornecedorId)
      : findOpmeFornecedorByName(opmeFornecedores, pacienteFormData.opmeFornecedor);

    const payload = toPacientePayload({
      ...pacienteFormData,
      medicoUserId: selectedMedico.selectedUser?.id ?? pacienteFormData.medicoUserId,
      medico: selectedMedico.selectedUser?.nome ?? selectedMedico.trimmedName,
      medicoAuxiliar1UserId: selectedMedicoAuxiliar1.selectedUser?.id ?? pacienteFormData.medicoAuxiliar1UserId,
      medicoAuxiliar1: selectedMedicoAuxiliar1.selectedUser?.nome ?? selectedMedicoAuxiliar1.trimmedName,
      medicoAuxiliar2UserId: selectedMedicoAuxiliar2.selectedUser?.id ?? pacienteFormData.medicoAuxiliar2UserId,
      medicoAuxiliar2: selectedMedicoAuxiliar2.selectedUser?.nome ?? selectedMedicoAuxiliar2.trimmedName,
      hospitalId: selectedHospital?.id ?? null,
      hospital: selectedHospital?.nome ?? pacienteFormData.hospital,
      convenioId: selectedConvenio?.idConvenio ?? null,
      convenio: selectedConvenio?.descricaoConvenio ?? pacienteFormData.convenio,
      opmeFornecedorId: selectedOpmeFornecedor?.idFornecedor ?? null,
      opmeFornecedor: selectedOpmeFornecedor?.fornecedor ?? pacienteFormData.opmeFornecedor,
    });
    const observationText = pacienteFormData.novaObservacao.trim();

    setPacienteFormLoading(true);
    setPacienteFormError('');
    setPacienteSuccessMessage('');

    try {
      const savedPaciente = await savePacienteMutation.mutateAsync({
        id: editingPacienteId,
        payload,
        token: session.token,
      });
      let warningMessage = '';

      for (const file of pendingPatientFiles) {
        await uploadPacienteArquivo(savedPaciente.id, file, session.token);
      }

      if (observationText) {
        try {
          await createPacienteObservacaoMutation.mutateAsync({
            pacienteId: savedPaciente.id,
            texto: observationText,
            token: session.token,
          });
        } catch (error) {
          warningMessage = getErrorMessage(error);
        }
      }

      setPacientes((current) => sortPacientesForListing(
        editingPacienteId
          ? current.map((paciente) => (paciente.id === savedPaciente.id ? savedPaciente : paciente))
          : [savedPaciente, ...current],
      ));
      const baseSuccessMessage = editingPacienteId
        ? 'Paciente atualizado.'
        : `Paciente cadastrado com senha inicial ${DEFAULT_PASSWORD}.`;
      const successMessage = warningMessage
        ? `${baseSuccessMessage} Paciente salvo, mas a observação não foi enviada.`
        : observationText
          ? `${baseSuccessMessage} Observação enviada.`
          : baseSuccessMessage;
      setPacienteSuccessMessage(successMessage);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardNotifications(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pacientesRoot(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pacienteObservacoesRoot(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.hospitais(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.convenios(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.opmeFornecedores(session.token) }),
      ]);
      resetPacienteForm();
      setPacienteCurrentPage(1);
      setModuleMode('list');
      await loadPacientes(session.token, true);
      await loadDashboardSummary(session.token, true);
      if (warningMessage) {
        setPacientesError(warningMessage);
      }
    } catch (error) {
      setPacienteFormError(getErrorMessage(error));
    } finally {
      setPacienteFormLoading(false);
    }
  };

  const deleteSelectedPaciente = async (paciente: Paciente) => {
    if (!session) {
      return;
    }

    if (!canDeletePatients) {
      setPacientesError('Apenas administradores podem excluir pacientes.');
      return;
    }

    setPacientesError('');
    setPacienteSuccessMessage('');

    try {
      await deletePacienteMutation.mutateAsync({ id: paciente.id, token: session.token });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pacientesRoot(session.token) }),
      ]);
      setPacienteSuccessMessage('Paciente excluído.');
      await loadPacientes(session.token, true);
      await loadDashboardSummary(session.token, true);
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    }
  };

  const handleDeletePaciente = (paciente: Paciente) => {
    confirmAction({
      tone: 'delete',
      title: 'Excluir paciente?',
      message: `Deseja excluir "${paciente.nomePaciente}"? Esta ação não poderá ser desfeita.`,
      confirmLabel: 'Sim',
      cancelLabel: 'Não',
      onConfirm: () => deleteSelectedPaciente(paciente),
    });
  };

  const handleDeletePacienteArquivo = async (paciente: Paciente, arquivoId: number) => {
    if (!session) {
      return;
    }

    if (!canEditPatients) {
      setPacientesError('Sem permissao para excluir arquivo do paciente.');
      return;
    }

    setPacientesError('');

    try {
      await deletePacienteArquivoMutation.mutateAsync({ pacienteId: paciente.id, arquivoId, token: session.token });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pacientesRoot(session.token) }),
      ]);
      const details = await getPaciente(paciente.id, session.token);
      setEditingPacienteDetails(details);
      await loadPacientes(session.token, true);
      await loadDashboardSummary(session.token, true);
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    }
  };

  const handleOpenPacienteFiles = async (paciente: Paciente) => {
    if (!session) {
      return;
    }

    const filesCount = paciente.arquivosCount ?? paciente.arquivos.length;

    if (!filesCount) {
      return;
    }

    setSelectedPatientFiles(paciente);
    setPatientFilesModalError('');
    setPatientFilesModalLoading(true);

    try {
      const details = await getPaciente(paciente.id, session.token);
      setSelectedPatientFiles(details);
    } catch (error) {
      setPatientFilesModalError(getErrorMessage(error));
    } finally {
      setPatientFilesModalLoading(false);
    }
  };

  const handleOpenCbhpmModal = () => {
    if (patientReadOnly || !canEditPatients) {
      return;
    }

    setCbhpmModalOpen(true);
    setCbhpmError('');
  };

  const handleSelectCbhpm = (procedimento: CbhpmGeral) => {
    setPacienteFormData((current) => {
      const nextProcedimentos = normalizePacienteProcedimentos([
        ...current.procedimentos,
        {
          cbhpmCodigo: procedimento.codigo,
          cbhpmPorte: procedimento.porte || '',
          procedimento: procedimento.procedimento,
          valorReferencia: procedimento.valorReferencia ?? null,
        },
      ]);

      return withPrimaryProcedimento({
        ...current,
        procedimentos: nextProcedimentos,
      });
    });
    setPacienteFormError('');
    setCbhpmModalOpen(false);
  };

  const handleRemovePacienteProcedimento = (indexToRemove: number) => {
    setPacienteFormData((current) => withPrimaryProcedimento({
      ...current,
      procedimentos: current.procedimentos.filter((_, index) => index !== indexToRemove),
    }));
  };

  const openPatientsList = () => {
    if (!canAccessPatients) {
      return;
    }

    navigateToView('patients');
    setModuleMode('list');
  };

  const openNewPacienteForm = () => {
    if (!canCreatePatients) {
      return;
    }

    resetPacienteForm();
    if (isMedical && session) {
      setPacienteFormData((current) => ({
        ...current,
        medicoUserId: session.user.id,
        medico: session.user.nome,
      }));
    }
    setPacienteSuccessMessage('');
    navigateToView('patients');
    setModuleMode('form');

    if (session) {
      void loadMedicalUsers(session.token);
    }

    if (session && !hospitais.length) {
      void loadHospitais(session.token);
    }

    if (session && !opmeFornecedores.length) {
      void loadOpmeFornecedores(session.token);
    }
  };

  const closePacienteForm = () => {
    resetPacienteForm();
    setModuleMode('list');
  };

  const clearPacienteFilters = () => {
    setPacienteFilters(emptyPacienteFilters);
  };

  const refreshPacientes = () => {
    if (session) {
      void loadPacientes(session.token, true);
    }
  };

  const refreshCbhpm = () => {
    applyCbhpmFiltersNow();

    if (!session || !canSearchCbhpm || !canConsultCbhpm) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: queryKeys.cbhpmRoot(session.token) });
  };

  const closePatientFilesModal = () => {
    setSelectedPatientFiles(null);
    setPatientFilesModalError('');
  };

  useEffect(() => {
    if (isAdmin) {
      return;
    }

    setPacienteFilters(emptyPacienteFilters);
    setDebouncedPacienteFilters(emptyPacienteFilters);
  }, [isAdmin]);

  useEffect(() => {
    if (pacienteCurrentPage > pacienteTotalPages) {
      setPacienteCurrentPage(pacienteTotalPages);
    }
  }, [pacienteCurrentPage, pacienteTotalPages]);

  useEffect(() => {
    if (cbhpmCurrentPage > cbhpmTotalPageCount) {
      setCbhpmCurrentPage(cbhpmTotalPageCount);
    }
  }, [cbhpmCurrentPage, cbhpmTotalPageCount]);

  return {
    pacientes,
    pacientesLoading,
    pacientesError,
    pacienteSuccessMessage,
    pacienteSearchTerm,
    setPacienteSearchTerm,
    pacienteExportLoading: patientExport.pacienteExportLoading,
    pacienteExportScope: patientExport.pacienteExportScope,
    setPacienteExportScope: patientExport.setPacienteExportScope,
    pacienteFilters,
    setPacienteFilters,
    debouncedPacienteSearchTerm,
    debouncedPacienteFilters,
    pacienteCurrentPage,
    setPacienteCurrentPage,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    pacientesTotalItems,
    pacientesTotalPages,
    pacienteTotalPages,
    paginatedPacientes,
    pacienteVisibleStart,
    pacienteVisibleEnd,
    pacienteFormData,
    setPacienteFormData,
    editingPacienteId,
    editingPaciente,
    pacienteFormError,
    pacienteFormLoading,
    pendingPatientFiles,
    patientFileInputKey,
    selectedPatientInfo,
    setSelectedPatientInfo,
    selectedPatientFiles,
    patientFilesModalLoading,
    patientFilesModalError,
    selectedPatientObservacoes: patientObservacoesState.selectedPatientObservacoes,
    patientObservacoes: patientObservacoesState.patientObservacoes,
    patientObservacoesLoading: patientObservacoesState.patientObservacoesLoading,
    patientObservacoesSaving: patientObservacoesState.patientObservacoesSaving,
    patientObservacoesError: patientObservacoesState.patientObservacoesError,
    patientObservationDraft: patientObservacoesState.patientObservationDraft,
    setPatientObservationDraft: patientObservacoesState.setPatientObservationDraft,
    patientObservationReplyTo: patientObservacoesState.patientObservationReplyTo,
    setPatientObservationReplyTo: patientObservacoesState.setPatientObservationReplyTo,
    medicalUsers,
    hospitais,
    hospitaisError,
    convenios,
    conveniosError,
    opmeFornecedores,
    opmeFornecedoresError,
    cbhpmModalOpen,
    setCbhpmModalOpen,
    cbhpmItems,
    cbhpmFilters,
    setCbhpmFilters,
    cbhpmFilterHint,
    canConsultCbhpm,
    canSearchCbhpm,
    cbhpmLoading,
    cbhpmError,
    cbhpmCurrentPage,
    setCbhpmCurrentPage,
    cbhpmSortBy,
    setCbhpmSortBy,
    cbhpmSortDirection,
    setCbhpmSortDirection,
    cbhpmTotalPageCount,
    cbhpmTotalItems,
    cbhpmVisibleStart,
    cbhpmVisibleEnd,
    loadMedicalUsers,
    loadPacientes,
    loadHospitais,
    loadConvenios,
    loadOpmeFornecedores,
    loadCbhpm,
    resetPatientsState,
    resetPacienteForm,
    handleEditPaciente,
    handlePacienteFilesChange,
    removePendingPatientFile,
    handleSubmitPaciente,
    handleDeletePaciente,
    handleDeletePacienteArquivo,
    handleOpenPacienteFiles,
    handleOpenPacienteObservacoes: patientObservacoesState.handleOpenPacienteObservacoes,
    handleOpenPacienteObservacoesById: patientObservacoesState.handleOpenPacienteObservacoesById,
    handleSubmitPacienteObservacao: patientObservacoesState.handleSubmitPacienteObservacao,
    handleOpenCbhpmModal,
    handleSelectCbhpm,
    handleRemovePacienteProcedimento,
    handleExportPacientes: patientExport.handleExportPacientes,
    openPatientsList,
    openNewPacienteForm,
    closePacienteForm,
    clearPacienteFilters,
    refreshPacientes,
    refreshCbhpm,
    closePatientFilesModal,
    closePatientObservacoesModal: patientObservacoesState.closePatientObservacoesModal,
  };
}

export type PatientsDomainState = ReturnType<typeof usePatientsDomain>;
