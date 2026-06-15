import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createPaciente,
  deletePaciente,
  deletePacienteArquivo,
  getAllCbhpmGeral,
  getConvenios,
  getHospitais,
  getPaciente,
  getPacientes,
  getUsers,
  updatePaciente,
  uploadPacienteArquivo,
} from '../../api';
import type {
  AppView,
  ModuleMode,
  PacienteExportFormat,
  PacienteExportScope,
} from '../../appTypes';
import { queryClient } from '../../queryClient';
import {
  ALLOWED_PATIENT_FILE_TYPES,
  CBHPM_PAGE_SIZE,
  DEFAULT_PASSWORD,
  findConvenioByDescription,
  findMedicalUserByName,
  getErrorMessage,
  LOOKUP_PAGE_SIZE,
  MAX_PATIENT_FILE_BYTES,
  MEDICAL_PROFILE_ID,
  PAGE_SIZE,
  PATIENT_EXPORT_PAGE_SIZE,
} from '../../shared/utils/formatters';
import {
  getPagedItems,
  getPagedTotal,
  getPagedTotalPages,
  sortConveniosByDescription,
  sortPacientesForListing,
  sortUsersByName,
} from '../../shared/utils/listing';
import type {
  AuthSession,
  CbhpmGeral,
  Paciente,
} from '../../types';
import { queryKeys } from '../../shared/queryKeys';
import {
  createXlsxBlob,
  downloadBlob,
  getPacienteExportRows,
  getPatientExportFileName,
  pacienteExportColumns,
} from './patientExport';
import {
  CBHPM_CACHE_FETCH_PAGE_SIZE,
  filterCbhpmCachedItems,
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
import { usePatientForm } from './usePatientForm';
import { usePatientList } from './usePatientList';
import { usePatientLookups } from './usePatientLookups';

const LIST_CACHE_TIME_MS = 20 * 1000;
const LOOKUP_CACHE_TIME_MS = 5 * 60 * 1000;

type UsePatientsDomainOptions = {
  session: AuthSession | null;
  activeView: AppView;
  moduleMode: ModuleMode;
  isAdmin: boolean;
  isMedical: boolean;
  canCreatePatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  patientReadOnly: boolean;
  setModuleMode: Dispatch<SetStateAction<ModuleMode>>;
  navigateToView: (view: AppView, replace?: boolean) => void;
  loadDashboardSummary: (token?: string, forceRefresh?: boolean) => Promise<void>;
};

export function usePatientsDomain({
  session,
  activeView,
  moduleMode,
  isAdmin,
  isMedical,
  canCreatePatients,
  canEditPatients,
  canDeletePatients,
  patientReadOnly,
  setModuleMode,
  navigateToView,
  loadDashboardSummary,
}: UsePatientsDomainOptions) {
  const patientList = usePatientList();
  const patientForm = usePatientForm(patientList.pacientes);
  const patientLookups = usePatientLookups();
  const cbhpmLookup = useCbhpmLookup();
  const [pacienteExportLoading, setPacienteExportLoading] = useState<PacienteExportFormat | null>(null);
  const [pacienteExportScope, setPacienteExportScope] = useState<PacienteExportScope>('visible');
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
    resetPatientLookups,
  } = patientLookups;
  const {
    cbhpmModalOpen,
    setCbhpmModalOpen,
    cbhpmItems,
    setCbhpmItems,
    cbhpmFilters,
    setCbhpmFilters,
    debouncedCbhpmFilters,
    cbhpmCurrentPage,
    setCbhpmCurrentPage,
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
  }), [debouncedPacienteFilters, debouncedPacienteSearchTerm, isAdmin, pacienteCurrentPage]);
  const medicalUsersQueryParams = useMemo(() => ({
    page: 1,
    pageSize: LOOKUP_PAGE_SIZE,
    profileId: MEDICAL_PROFILE_ID,
  }), []);
  const sessionReady = Boolean(session && !session.user.precisaTrocarSenha);
  const pacientesQuery = useQuery({
    queryKey: queryKeys.pacientes(session?.token ?? '', pacientesQueryParams),
    queryFn: () => getPacientes(session?.token ?? '', pacientesQueryParams),
    enabled: sessionReady && activeView === 'patients' && moduleMode === 'list',
    staleTime: LIST_CACHE_TIME_MS,
  });
  const medicalUsersQuery = useQuery({
    queryKey: queryKeys.medicalUsers(session?.token ?? ''),
    queryFn: () => getUsers(session?.token ?? '', medicalUsersQueryParams),
    enabled: sessionReady && activeView === 'patients' && isAdmin,
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
  const cbhpmCacheQuery = useQuery({
    queryKey: queryKeys.cbhpmCache(session?.token ?? ''),
    queryFn: () => getAllCbhpmGeral(session?.token ?? '', CBHPM_CACHE_FETCH_PAGE_SIZE),
    enabled: sessionReady && cbhpmModalOpen,
    staleTime: LOOKUP_CACHE_TIME_MS,
    gcTime: 30 * 60 * 1000,
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
  const filteredCbhpmItems = useMemo(
    () => filterCbhpmCachedItems(cbhpmCacheQuery.data ?? [], debouncedCbhpmFilters),
    [cbhpmCacheQuery.data, debouncedCbhpmFilters],
  );

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
      setMedicalUsers(sortUsersByName(getPagedItems(medicalUsersQuery.data)));
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
    setCbhpmLoading(cbhpmCacheQuery.isLoading || (cbhpmCacheQuery.isFetching && !cbhpmCacheQuery.data?.length));
  }, [cbhpmCacheQuery.data?.length, cbhpmCacheQuery.isFetching, cbhpmCacheQuery.isLoading, setCbhpmLoading]);

  useEffect(() => {
    if (!cbhpmModalOpen || !cbhpmCacheQuery.data) {
      return;
    }

    const cbhpmPageStart = (cbhpmCurrentPage - 1) * CBHPM_PAGE_SIZE;
    const cbhpmPageEnd = cbhpmPageStart + CBHPM_PAGE_SIZE;

    setCbhpmItems(filteredCbhpmItems.slice(cbhpmPageStart, cbhpmPageEnd));
    setCbhpmTotalItems(filteredCbhpmItems.length);
    setCbhpmTotalPages(Math.max(1, Math.ceil(filteredCbhpmItems.length / CBHPM_PAGE_SIZE)));
    setCbhpmError('');
  }, [
    cbhpmCacheQuery.data,
    cbhpmCurrentPage,
    cbhpmModalOpen,
    filteredCbhpmItems,
    setCbhpmError,
    setCbhpmItems,
    setCbhpmTotalItems,
    setCbhpmTotalPages,
  ]);

  useEffect(() => {
    if (cbhpmCacheQuery.error) {
      setCbhpmError(getErrorMessage(cbhpmCacheQuery.error));
    }
  }, [cbhpmCacheQuery.error, setCbhpmError]);

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
    _page = pacienteCurrentPage,
    _search = debouncedPacienteSearchTerm,
    _filters = debouncedPacienteFilters,
    forceRefresh = false,
  ) => {
    if (!token) {
      return;
    }

    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.pacientesRoot(token) });
    }

    await pacientesQuery.refetch();
  };

  const fetchPacientesForExport = async (query: NonNullable<Parameters<typeof getPacientes>[1]>) => {
    if (!session) {
      return [];
    }

    const firstResult = await getPacientes(session.token, {
      page: 1,
      pageSize: PATIENT_EXPORT_PAGE_SIZE,
      ...query,
    });

    const items = [...getPagedItems(firstResult)];
    const totalPagesForExport = getPagedTotalPages(firstResult);

    for (let page = 2; page <= totalPagesForExport; page += 1) {
      const result = await getPacientes(session.token, {
        ...query,
        page,
        pageSize: PATIENT_EXPORT_PAGE_SIZE,
      });
      items.push(...getPagedItems(result));
    }

    return sortPacientesForListing(items);
  };

  const loadPacientesForExport = async (scope: PacienteExportScope) => {
    if (scope === 'visible') {
      return paginatedPacientes;
    }

    if (scope === 'doctor') {
      const medico = pacienteFilters.medico.trim();

      if (!medico) {
        throw new Error('Selecione um medico antes de exportar por medico.');
      }

      return fetchPacientesForExport({ medico });
    }

    return fetchPacientesForExport({});
  };

  const handleExportPacientes = async (format: PacienteExportFormat) => {
    if (!session || pacienteExportLoading) {
      return;
    }

    setPacienteExportLoading(format);
    setPacientesError('');

    try {
      const exportItems = await loadPacientesForExport(pacienteExportScope);
      const rows = getPacienteExportRows(exportItems);

      if (format === 'xlsx') {
        downloadBlob(createXlsxBlob(rows), getPatientExportFileName('xlsx'));
        return;
      }

      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const autoTable = autoTableModule.default;
      const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      document.setFontSize(14);
      document.text('Cadastro de pacientes', 40, 34);
      document.setFontSize(9);
      document.text(`Gerado em ${new Intl.DateTimeFormat('pt-BR').format(new Date())}`, 40, 50);
      autoTable(document, {
        head: [pacienteExportColumns.map((column) => column.header)],
        body: exportItems.map((paciente) => pacienteExportColumns.map((column) => column.getValue(paciente))),
        startY: 64,
        styles: {
          fontSize: 6.6,
          cellPadding: 3,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [15, 118, 110],
          textColor: 255,
        },
        margin: { left: 24, right: 24 },
      });
      document.save(getPatientExportFileName('pdf'));
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    } finally {
      setPacienteExportLoading(null);
    }
  };

  const loadCbhpm = async (
    token = session?.token,
    _page = cbhpmCurrentPage,
    _filters = debouncedCbhpmFilters,
    forceRefresh = false,
  ) => {
    if (!token) {
      return;
    }

    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.cbhpmCache(token) });
    }

    await cbhpmCacheQuery.refetch();
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

  const resetPatientsState = () => {
    resetPatientListState();
    resetPatientLookups();
    setSelectedPatientInfo(null);
    setSelectedPatientFiles(null);
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

  const handleSubmitPaciente = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      return;
    }

    if (patientReadOnly) {
      setPacienteFormError('Pacientes podem apenas visualizar o cadastro.');
      return;
    }

    const validationError = validatePacienteForm(pacienteFormData);

    if (validationError) {
      setPacienteFormError(validationError);
      return;
    }

    const selectedMedicoUser = pacienteFormData.medicoUserId != null
      ? medicalUsers.find((user) => user.id === pacienteFormData.medicoUserId)
      : findMedicalUserByName(medicalUsers, pacienteFormData.medico);

    if (isAdmin && pacienteFormData.medico && !selectedMedicoUser) {
      setPacienteFormError('Selecione um medico cadastrado com perfil Medicos.');
      return;
    }

    const selectedConvenio = pacienteFormData.convenioId != null
      ? convenios.find((convenio) => convenio.idConvenio === pacienteFormData.convenioId)
      : findConvenioByDescription(convenios, pacienteFormData.convenio);

    if (pacienteFormData.convenio && !selectedConvenio) {
      setPacienteFormError('Selecione um convenio cadastrado.');
      return;
    }

    const payload = toPacientePayload({
      ...pacienteFormData,
      medicoUserId: selectedMedicoUser?.id ?? pacienteFormData.medicoUserId,
      medico: selectedMedicoUser?.nome ?? pacienteFormData.medico,
      convenioId: selectedConvenio?.idConvenio ?? null,
      convenio: selectedConvenio?.descricaoConvenio ?? '',
    });

    setPacienteFormLoading(true);
    setPacienteFormError('');
    setPacienteSuccessMessage('');

    try {
      const savedPaciente = await savePacienteMutation.mutateAsync({
        id: editingPacienteId,
        payload,
        token: session.token,
      });

      for (const file of pendingPatientFiles) {
        await uploadPacienteArquivo(savedPaciente.id, file, session.token);
      }

      setPacientes((current) => sortPacientesForListing(
        editingPacienteId
          ? current.map((paciente) => (paciente.id === savedPaciente.id ? savedPaciente : paciente))
          : [savedPaciente, ...current],
      ));
      if (!editingPacienteId) {
        setPacientesTotalItems((current) => current + 1);
      }
      setPacienteSuccessMessage(editingPacienteId ? 'Paciente atualizado.' : `Paciente cadastrado com senha inicial ${DEFAULT_PASSWORD}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pacientesRoot(session.token) }),
      ]);
      resetPacienteForm();
      setPacienteCurrentPage(1);
      setModuleMode('list');
      await loadPacientes(session.token, 1, debouncedPacienteSearchTerm, debouncedPacienteFilters, true);
      await loadDashboardSummary(session.token, true);
    } catch (error) {
      setPacienteFormError(getErrorMessage(error));
    } finally {
      setPacienteFormLoading(false);
    }
  };

  const handleDeletePaciente = async (paciente: Paciente) => {
    if (!session || !window.confirm(`Excluir ${paciente.nomePaciente}?`)) {
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
      setPacienteSuccessMessage('Paciente excluido.');
      await loadPacientes(session.token, pacienteCurrentPage, debouncedPacienteSearchTerm, debouncedPacienteFilters, true);
      await loadDashboardSummary(session.token, true);
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    }
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
      await loadPacientes(session.token, pacienteCurrentPage, debouncedPacienteSearchTerm, debouncedPacienteFilters, true);
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
    if (patientReadOnly) {
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

    if (session && isAdmin) {
      void loadMedicalUsers(session.token);
    }

    if (session && !hospitais.length) {
      void loadHospitais(session.token);
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
      void loadPacientes(session.token, pacienteCurrentPage, debouncedPacienteSearchTerm, debouncedPacienteFilters, true);
    }
  };

  const refreshCbhpm = () => {
    if (session) {
      void loadCbhpm(session.token, cbhpmCurrentPage, debouncedCbhpmFilters, true);
    }
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
    pacienteExportLoading,
    pacienteExportScope,
    setPacienteExportScope,
    pacienteFilters,
    setPacienteFilters,
    debouncedPacienteSearchTerm,
    debouncedPacienteFilters,
    pacienteCurrentPage,
    setPacienteCurrentPage,
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
    medicalUsers,
    hospitais,
    hospitaisError,
    convenios,
    conveniosError,
    cbhpmModalOpen,
    setCbhpmModalOpen,
    cbhpmItems,
    cbhpmFilters,
    setCbhpmFilters,
    cbhpmLoading,
    cbhpmError,
    cbhpmCurrentPage,
    setCbhpmCurrentPage,
    cbhpmTotalPageCount,
    cbhpmTotalItems,
    cbhpmVisibleStart,
    cbhpmVisibleEnd,
    loadMedicalUsers,
    loadPacientes,
    loadHospitais,
    loadConvenios,
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
    handleOpenCbhpmModal,
    handleSelectCbhpm,
    handleRemovePacienteProcedimento,
    handleExportPacientes,
    openPatientsList,
    openNewPacienteForm,
    closePacienteForm,
    clearPacienteFilters,
    refreshPacientes,
    refreshCbhpm,
    closePatientFilesModal,
  };
}
