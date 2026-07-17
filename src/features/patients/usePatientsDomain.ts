import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  createPaciente,
  createPacienteObservacao,
  deletePaciente,
  deletePacienteArquivo,
  getPaciente,
  updatePaciente,
  uploadPacienteArquivo,
} from '../../services';
import type {
  AppView,
  ModuleMode,
} from '../../appTypes';
import { queryClient } from '../../queryClient';
import {
  DEFAULT_PASSWORD,
  getErrorMessage,
} from '../../shared/utils/formatters';
import {
  sortPacientesForListing,
} from '../../shared/utils/listing';
import type {
  AuthSession,
  CbhpmGeral,
  Paciente,
  PacientePayload,
} from '../../types';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import { queryKeys } from '../../shared/queryKeys';
import {
  emptyPacienteFilters,
  normalizePacienteProcedimentos,
  validatePacienteForm,
  withPrimaryProcedimento,
} from './patientUtils';
import {
  buildPatientPayloadWithLookups,
  getInvalidPatientFileMessage,
} from './patientDomainHelpers';
import { useCbhpmLookup } from './useCbhpmLookup';
import { usePatientsDomainQueries } from './usePatientsDomainQueries';
import { usePatientExport } from './usePatientExport';
import { usePatientForm } from './usePatientForm';
import { usePatientList } from './usePatientList';
import { usePatientLookups } from './usePatientLookups';
import { usePatientObservacoes } from './usePatientObservacoes';

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
    pacientesTotalPages,
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
    hospitais,
    hospitaisError,
    convenios,
    conveniosError,
    opmeFornecedores,
    opmeFornecedoresError,
    resetPatientLookups,
  } = patientLookups;
  const {
    cbhpmModalOpen,
    setCbhpmModalOpen,
    cbhpmItems,
    cbhpmFilters,
    setCbhpmFilters,
    applyCbhpmFiltersNow,
    cbhpmCurrentPage,
    setCbhpmCurrentPage,
    sortBy: cbhpmSortBy,
    setSortBy: setCbhpmSortBy,
    sortDirection: cbhpmSortDirection,
    setSortDirection: setCbhpmSortDirection,
    cbhpmTotalItems,
    cbhpmTotalPageCount,
    cbhpmLoading,
    cbhpmError,
    setCbhpmError,
    cbhpmVisibleStart,
    cbhpmVisibleEnd,
    resetCbhpmLookup,
  } = cbhpmLookup;

  const {
    cbhpmFilterHint,
    canSearchCbhpm,
    loadMedicalUsers,
    loadPacientes,
    loadCbhpm,
    loadHospitais,
    loadConvenios,
    loadOpmeFornecedores,
  } = usePatientsDomainQueries({
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
  });
  const savePacienteMutation = useMutation({
    mutationFn: ({ id, payload, token }: { id: number | null; payload: PacientePayload; token: string }) => (
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

  const patientExport = usePatientExport({
    session,
    companyName,
    paginatedPacientes,
    pacienteFilters,
    setPacientesError,
  });

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

    const invalidFileMessage = getInvalidPatientFileMessage(files);

    if (invalidFileMessage) {
      setPacienteFormError(invalidFileMessage);
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

    const {
      payload,
      selectedMedico,
      selectedMedicoAuxiliar1,
      selectedMedicoAuxiliar2,
    } = buildPatientPayloadWithLookups({
      pacienteFormData,
      medicalUsers,
      hospitais,
      convenios,
      opmeFornecedores,
    });

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
