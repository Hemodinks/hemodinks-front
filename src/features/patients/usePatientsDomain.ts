import { type FormEvent, useState } from 'react';
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
import { queryClient } from '../../queryClient';
import { getErrorMessage } from '../../shared/utils/formatters';
import { sortPacientesForListing } from '../../shared/utils/listing';
import type { Paciente, PacientePayload } from '../../types';
import { queryKeys } from '../../shared/queryKeys';
import { emptyPacienteFilters } from './patientUtils';
import { preparePatientPayload } from './patientDomainHelpers';
import { useCbhpmLookup } from './useCbhpmLookup';
import { usePatientsDomainQueries } from './usePatientsDomainQueries';
import { usePatientExport } from './usePatientExport';
import { usePatientForm } from './usePatientForm';
import { usePatientList } from './usePatientList';
import { usePatientLookups } from './usePatientLookups';
import { usePatientObservacoes } from './usePatientObservacoes';
import type { UsePatientsDomainOptions } from './patientsDomainTypes';
import { usePatientFileActions } from './usePatientFileActions';
import { usePatientProcedureActions } from './usePatientProcedureActions';
import { usePatientPaginationGuards } from './usePatientPaginationGuards';

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
  const patientFileActions = usePatientFileActions({
    session,
    readOnly: patientReadOnly,
    setFormError: setPacienteFormError,
    setPendingFiles: setPendingPatientFiles,
  });
  const {
    selectedPatientFiles,
    setSelectedPatientFiles,
    patientFilesModalLoading,
    setPatientFilesModalLoading,
    patientFilesModalError,
    setPatientFilesModalError,
    handlePacienteFilesChange,
    removePendingPatientFile,
    handleOpenPacienteFiles,
    closePatientFilesModal,
  } = patientFileActions;

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
  const patientProcedureActions = usePatientProcedureActions({
    readOnly: patientReadOnly,
    canEdit: canEditPatients,
    setFormData: setPacienteFormData,
    setFormError: setPacienteFormError,
    setModalOpen: setCbhpmModalOpen,
    setLookupError: setCbhpmError,
  });
  usePatientPaginationGuards({
    isAdmin,
    currentPage: pacienteCurrentPage,
    totalPages: pacienteTotalPages,
    cbhpmCurrentPage,
    cbhpmTotalPages: cbhpmTotalPageCount,
    setFilters: setPacienteFilters,
    setDebouncedFilters: setDebouncedPacienteFilters,
    setCurrentPage: setPacienteCurrentPage,
    setCbhpmCurrentPage,
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

    const prepared = preparePatientPayload({
      pacienteFormData,
      medicalUsers,
      hospitais,
      convenios,
      opmeFornecedores,
    });

    if (prepared.error || !prepared.payload) {
      setPacienteFormError(prepared.error);
      return;
    }
    const payload = prepared.payload;

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
        : 'Paciente cadastrado com senha temporária. Oriente a alteração no primeiro acesso.';
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

  return {
    ...patientList,
    ...patientForm,
    ...patientLookups,
    ...cbhpmLookup,
    ...patientExport,
    ...patientObservacoesState,
    // Preserve the public list aliases after spreading the CBHPM state,
    // which also owns fields named sortBy and sortDirection.
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    cbhpmSortBy,
    setCbhpmSortBy,
    cbhpmSortDirection,
    setCbhpmSortDirection,
    selectedPatientInfo,
    setSelectedPatientInfo,
    selectedPatientFiles,
    patientFilesModalLoading,
    patientFilesModalError,
    cbhpmFilterHint,
    canConsultCbhpm,
    canSearchCbhpm,
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
    ...patientProcedureActions,
    openPatientsList,
    openNewPacienteForm,
    closePacienteForm,
    clearPacienteFilters,
    refreshPacientes,
    refreshCbhpm,
    closePatientFilesModal,
  };
}

export type PatientsDomainState = ReturnType<typeof usePatientsDomain>;
