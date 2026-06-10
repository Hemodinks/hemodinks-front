import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import {
  createPaciente,
  deletePaciente,
  deletePacienteArquivo,
  getCbhpmGeral,
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
  CbhpmFilters,
  ModuleMode,
  PacienteExportFormat,
  PacienteExportScope,
  PacienteFilters,
} from '../../appTypes';
import { queryClient } from '../../queryClient';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
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
  Convenio,
  Hospital,
  Paciente,
  PacienteFormData,
  User,
} from '../../types';
import {
  createXlsxBlob,
  downloadBlob,
  getPacienteExportRows,
  getPatientExportFileName,
  pacienteExportColumns,
} from './patientExport';
import {
  emptyPacienteFilters,
  emptyPacienteForm,
  getPacienteFilterQuery,
  getPacienteFormData,
  normalizePacienteProcedimentos,
  toPacientePayload,
  validatePacienteForm,
  withPrimaryProcedimento,
} from './patientUtils';

const LIST_CACHE_TIME_MS = 20 * 1000;
const LOOKUP_CACHE_TIME_MS = 5 * 60 * 1000;

const emptyCbhpmFilters: CbhpmFilters = {
  codigo: '',
  procedimento: '',
  porte: '',
};

function arePacienteFiltersEqual(current: PacienteFilters, debounced: PacienteFilters) {
  return current.medico === debounced.medico
    && current.convenio === debounced.convenio
    && current.procedimento === debounced.procedimento;
}

function areCbhpmFiltersEqual(current: CbhpmFilters, debounced: CbhpmFilters) {
  return current.codigo === debounced.codigo
    && current.procedimento === debounced.procedimento
    && current.porte === debounced.porte;
}

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
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacientesLoading, setPacientesLoading] = useState(false);
  const [pacientesError, setPacientesError] = useState('');
  const [pacienteSuccessMessage, setPacienteSuccessMessage] = useState('');
  const [pacienteSearchTerm, setPacienteSearchTerm] = useState('');
  const [pacienteExportLoading, setPacienteExportLoading] = useState<PacienteExportFormat | null>(null);
  const [pacienteExportScope, setPacienteExportScope] = useState<PacienteExportScope>('visible');
  const [pacienteFilters, setPacienteFilters] = useState<PacienteFilters>(emptyPacienteFilters);
  const [pacienteCurrentPage, setPacienteCurrentPage] = useState(1);
  const resetPacientesPage = useCallback(() => setPacienteCurrentPage(1), []);
  const [debouncedPacienteSearchTerm] = useDebouncedValue(pacienteSearchTerm, { onCommit: resetPacientesPage });
  const [debouncedPacienteFilters, setDebouncedPacienteFilters] = useDebouncedValue(pacienteFilters, {
    isEqual: arePacienteFiltersEqual,
    onCommit: resetPacientesPage,
  });
  const [pacientesTotalItems, setPacientesTotalItems] = useState(0);
  const [pacientesTotalPages, setPacientesTotalPages] = useState(1);
  const [pacienteFormData, setPacienteFormData] = useState<PacienteFormData>(emptyPacienteForm);
  const [editingPacienteId, setEditingPacienteId] = useState<number | null>(null);
  const [editingPacienteDetails, setEditingPacienteDetails] = useState<Paciente | null>(null);
  const [pacienteFormLoading, setPacienteFormLoading] = useState(false);
  const [pacienteFormError, setPacienteFormError] = useState('');
  const [patientFileInputKey, setPatientFileInputKey] = useState(0);
  const [pendingPatientFiles, setPendingPatientFiles] = useState<File[]>([]);
  const [selectedPatientInfo, setSelectedPatientInfo] = useState<Paciente | null>(null);
  const [selectedPatientFiles, setSelectedPatientFiles] = useState<Paciente | null>(null);
  const [patientFilesModalLoading, setPatientFilesModalLoading] = useState(false);
  const [patientFilesModalError, setPatientFilesModalError] = useState('');
  const [medicalUsers, setMedicalUsers] = useState<User[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [hospitaisError, setHospitaisError] = useState('');
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [conveniosError, setConveniosError] = useState('');
  const [cbhpmModalOpen, setCbhpmModalOpen] = useState(false);
  const [cbhpmItems, setCbhpmItems] = useState<CbhpmGeral[]>([]);
  const [cbhpmFilters, setCbhpmFilters] = useState<CbhpmFilters>(emptyCbhpmFilters);
  const [cbhpmCurrentPage, setCbhpmCurrentPage] = useState(1);
  const resetCbhpmPage = useCallback(() => setCbhpmCurrentPage(1), []);
  const [debouncedCbhpmFilters] = useDebouncedValue(cbhpmFilters, {
    isEqual: areCbhpmFiltersEqual,
    onCommit: resetCbhpmPage,
  });
  const [cbhpmTotalItems, setCbhpmTotalItems] = useState(0);
  const [cbhpmTotalPages, setCbhpmTotalPages] = useState(1);
  const [cbhpmLoading, setCbhpmLoading] = useState(false);
  const [cbhpmError, setCbhpmError] = useState('');

  const pacienteTotalPages = Math.max(1, pacientesTotalPages);
  const pacientePageStart = (pacienteCurrentPage - 1) * PAGE_SIZE;
  const pacientePageEnd = pacientePageStart + PAGE_SIZE;
  const paginatedPacientes = pacientes;
  const pacienteVisibleStart = pacientesTotalItems ? pacientePageStart + 1 : 0;
  const pacienteVisibleEnd = Math.min(pacientePageEnd, pacientesTotalItems);
  const cbhpmTotalPageCount = Math.max(1, cbhpmTotalPages);
  const cbhpmPageStart = (cbhpmCurrentPage - 1) * CBHPM_PAGE_SIZE;
  const cbhpmPageEnd = cbhpmPageStart + CBHPM_PAGE_SIZE;
  const cbhpmVisibleStart = cbhpmTotalItems ? cbhpmPageStart + 1 : 0;
  const cbhpmVisibleEnd = Math.min(cbhpmPageEnd, cbhpmTotalItems);
  const editingPaciente = useMemo(
    () => editingPacienteDetails ?? pacientes.find((paciente) => paciente.id === editingPacienteId) ?? null,
    [editingPacienteDetails, editingPacienteId, pacientes],
  );

  const loadMedicalUsers = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    try {
      const query = {
        page: 1,
        pageSize: LOOKUP_PAGE_SIZE,
        profileId: MEDICAL_PROFILE_ID,
      };
      const result = await queryClient.fetchQuery({
        queryKey: ['medicalUsers', token],
        queryFn: () => getUsers(token, query),
        staleTime: forceRefresh ? 0 : LOOKUP_CACHE_TIME_MS,
      });
      setMedicalUsers(sortUsersByName(getPagedItems(result)));
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    }
  };

  const loadPacientes = async (
    token = session?.token,
    page = pacienteCurrentPage,
    search = debouncedPacienteSearchTerm,
    filters = debouncedPacienteFilters,
    forceRefresh = false,
  ) => {
    if (!token) {
      return;
    }

    setPacientesLoading(true);
    setPacientesError('');

    try {
      const query = {
        page,
        pageSize: PAGE_SIZE,
        search,
        ...getPacienteFilterQuery(filters, isAdmin),
      };
      const result = await queryClient.fetchQuery({
        queryKey: ['pacientes', token, query],
        queryFn: () => getPacientes(token, query),
        staleTime: forceRefresh ? 0 : LIST_CACHE_TIME_MS,
      });
      setPacientes(sortPacientesForListing(getPagedItems(result)));
      setPacientesTotalItems(getPagedTotal(result));
      setPacientesTotalPages(getPagedTotalPages(result));
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    } finally {
      setPacientesLoading(false);
    }
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
    page = cbhpmCurrentPage,
    filters = debouncedCbhpmFilters,
    forceRefresh = false,
  ) => {
    if (!token) {
      return;
    }

    setCbhpmLoading(true);
    setCbhpmError('');

    try {
      const query = {
        page,
        pageSize: CBHPM_PAGE_SIZE,
        codigo: filters.codigo,
        procedimento: filters.procedimento,
        porte: filters.porte,
      };
      const result = await queryClient.fetchQuery({
        queryKey: ['cbhpm', token, query],
        queryFn: () => getCbhpmGeral(token, query),
        staleTime: forceRefresh ? 0 : LIST_CACHE_TIME_MS,
      });
      setCbhpmItems(getPagedItems(result));
      setCbhpmTotalItems(getPagedTotal(result));
      setCbhpmTotalPages(getPagedTotalPages(result));
    } catch (error) {
      setCbhpmError(getErrorMessage(error));
    } finally {
      setCbhpmLoading(false);
    }
  };

  const loadHospitais = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    setHospitaisError('');

    try {
      const result = await queryClient.fetchQuery({
        queryKey: ['hospitais', token],
        queryFn: () => getHospitais(token),
        staleTime: forceRefresh ? 0 : LOOKUP_CACHE_TIME_MS,
      });
      setHospitais(result);
    } catch (error) {
      setHospitaisError(getErrorMessage(error));
    }
  };

  const loadConvenios = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    setConveniosError('');

    try {
      const result = await queryClient.fetchQuery({
        queryKey: ['convenios', token],
        queryFn: () => getConvenios(token),
        staleTime: forceRefresh ? 0 : LOOKUP_CACHE_TIME_MS,
      });
      setConvenios(sortConveniosByDescription(result));
    } catch (error) {
      setConveniosError(getErrorMessage(error));
    }
  };

  const resetPacienteForm = () => {
    setPacienteFormData(emptyPacienteForm);
    setEditingPacienteId(null);
    setEditingPacienteDetails(null);
    setPacienteFormError('');
    setPendingPatientFiles([]);
    setPatientFileInputKey((key) => key + 1);
  };

  const resetPatientsState = () => {
    setPacientes([]);
    setPacientesError('');
    setPacienteSuccessMessage('');
    setPacienteFilters(emptyPacienteFilters);
    setDebouncedPacienteFilters(emptyPacienteFilters);
    setPacientesTotalItems(0);
    setPacientesTotalPages(1);
    setMedicalUsers([]);
    setHospitais([]);
    setHospitaisError('');
    setConvenios([]);
    setConveniosError('');
    setSelectedPatientInfo(null);
    setSelectedPatientFiles(null);
    setPatientFilesModalError('');
    setPatientFilesModalLoading(false);
    setCbhpmModalOpen(false);
    setCbhpmItems([]);
    setCbhpmFilters(emptyCbhpmFilters);
    setCbhpmTotalItems(0);
    setCbhpmTotalPages(1);
    resetPacienteForm();
  };

  const handleEditPaciente = async (paciente: Paciente) => {
    if (!session) {
      return;
    }

    setEditingPacienteId(paciente.id);
    setEditingPacienteDetails(paciente);
    setPacienteFormError('');
    setPacienteSuccessMessage('');
    navigateToView('patients');
    setModuleMode('form');
    setPendingPatientFiles([]);
    setPacienteFormData(getPacienteFormData(paciente));
    setPatientFileInputKey((key) => key + 1);

    try {
      const details = await getPaciente(paciente.id, session.token);
      setEditingPacienteDetails(details);
      setPacienteFormData(getPacienteFormData(details));
    } catch (error) {
      setPacienteFormError(getErrorMessage(error));
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
      const savedPaciente = editingPacienteId
        ? await updatePaciente(editingPacienteId, payload, session.token)
        : await createPaciente(payload, session.token);

      for (const file of pendingPatientFiles) {
        await uploadPacienteArquivo(savedPaciente.id, file, session.token);
      }

      setPacienteSuccessMessage(editingPacienteId ? 'Paciente atualizado.' : `Paciente cadastrado com senha inicial ${DEFAULT_PASSWORD}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary', session.token] }),
        queryClient.invalidateQueries({ queryKey: ['pacientes', session.token] }),
      ]);
      resetPacienteForm();
      setPacienteCurrentPage(1);
      setModuleMode('list');
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
      await deletePaciente(paciente.id, session.token);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary', session.token] }),
        queryClient.invalidateQueries({ queryKey: ['pacientes', session.token] }),
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
      await deletePacienteArquivo(paciente.id, arquivoId, session.token);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary', session.token] }),
        queryClient.invalidateQueries({ queryKey: ['pacientes', session.token] }),
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
    if (session && !session.user.precisaTrocarSenha && activeView === 'patients') {
      if (moduleMode === 'list') {
        void loadPacientes(session.token, pacienteCurrentPage, debouncedPacienteSearchTerm, debouncedPacienteFilters);
      }

      if (isAdmin) {
        void loadMedicalUsers(session.token);
      }
    }
  }, [session?.token, session?.user.precisaTrocarSenha, isAdmin, activeView, moduleMode, pacienteCurrentPage, debouncedPacienteSearchTerm, debouncedPacienteFilters]);

  useEffect(() => {
    if (session && !session.user.precisaTrocarSenha && cbhpmModalOpen) {
      void loadCbhpm(session.token, cbhpmCurrentPage, debouncedCbhpmFilters);
    }
  }, [session?.token, session?.user.precisaTrocarSenha, cbhpmModalOpen, cbhpmCurrentPage, debouncedCbhpmFilters]);

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
