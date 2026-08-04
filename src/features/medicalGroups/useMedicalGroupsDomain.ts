import { type Dispatch, type FormEvent, type SetStateAction, useState } from 'react';
import type { AppView, ModuleMode } from '../../appTypes';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import { getErrorMessage, PAGE_SIZE } from '../../shared/utils/formatters';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import type { MedicalGroup, MedicalGroupFormData } from './medicalGroupTypes';
import type { MedicalUserOption } from '../../shared/domain/clinicalContracts';
import { useMedicalGroupsResources } from './useMedicalGroupsResources';

const emptyMedicalGroupForm: MedicalGroupFormData = {
  nome: '',
  ativo: true,
  medicoUserIds: [],
};

type UseMedicalGroupsDomainOptions = {
  session: AuthSession | null;
  activeView: AppView;
  moduleMode: ModuleMode;
  canAccessMedicalGroups: boolean;
  setModuleMode: Dispatch<SetStateAction<ModuleMode>>;
  navigateToView: (view: AppView, replace?: boolean) => void;
  confirmAction: ConfirmAction;
};

export function useMedicalGroupsDomain({
  session,
  activeView,
  moduleMode,
  canAccessMedicalGroups,
  setModuleMode,
  navigateToView,
  confirmAction,
}: UseMedicalGroupsDomainOptions) {
  const [groups, setGroups] = useState<MedicalGroup[]>([]);
  const [groupsError, setGroupsError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('recent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MedicalGroupFormData>(emptyMedicalGroupForm);
  const [formError, setFormError] = useState('');
  const [availableMedicalUsers, setAvailableMedicalUsers] = useState<MedicalUserOption[]>([]);

  const resources = useMedicalGroupsResources({
    session,
    activeView,
    moduleMode,
    canAccessMedicalGroups,
    currentPage,
    searchTerm,
    sortBy,
    sortDirection,
    totalItems,
    setGroups,
    setGroupsError,
    setTotalItems,
    setTotalPages,
    setAvailableMedicalUsers,
  });
  const { groupsLoading, formLoading, medicalGroupsCount } = resources;

  const visibleStart = totalItems ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const visibleEnd = totalItems ? Math.min(totalItems, visibleStart + groups.length - 1) : 0;
  const resetForm = () => {
    setEditingGroupId(null);
    setFormData(emptyMedicalGroupForm);
    setFormError('');
  };

  const resetMedicalGroupsState = () => {
    setGroups([]);
    setGroupsError('');
    setSuccessMessage('');
    setSearchTerm('');
    setCurrentPage(1);
    setSortBy('recent');
    setSortDirection('desc');
    setTotalItems(0);
    setTotalPages(1);
    setAvailableMedicalUsers([]);
    resetForm();
  };

  const { loadMedicalGroups, loadAvailableMedicalUsers } = resources;

  const openMedicalGroupsList = () => {
    navigateToView('medicalGroups');
    setModuleMode('list');
    resetForm();
  };

  const openNewMedicalGroupForm = () => {
    resetForm();
    setSuccessMessage('');
    navigateToView('medicalGroups');
    setModuleMode('form');
    if (session) {
      void loadAvailableMedicalUsers(session.token);
    }
  };

  const handleEditMedicalGroup = async (group: MedicalGroup) => {
    if (!session) {
      return;
    }

    setSuccessMessage('');
    setFormError('');
    navigateToView('medicalGroups');
    setModuleMode('form');
    try {
      const details = await resources.editOperation.execute(group.id, session.token);
      setEditingGroupId(details.id);
      setFormData({
        nome: details.nome,
        ativo: details.ativo,
        medicoUserIds: details.membros.map((member) => member.userId),
      });
      await loadAvailableMedicalUsers(session.token);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const deleteSelectedMedicalGroup = async (group: MedicalGroup) => {
    if (!session) {
      return;
    }

    setGroupsError('');
    setSuccessMessage('');

    try {
      await resources.deleteMutation.mutateAsync({ id: group.id, token: session.token });
      setSuccessMessage('Grupo médico excluído.');
      await loadMedicalGroups(session.token, true);
    } catch (error) {
      setGroupsError(getErrorMessage(error));
    }
  };

  const handleDeleteMedicalGroup = (group: MedicalGroup) => {
    confirmAction({
      tone: 'delete',
      title: 'Excluir grupo médico?',
      message: `Deseja excluir "${group.nome}"? Esta ação não poderá ser desfeita.`,
      confirmLabel: 'Sim',
      cancelLabel: 'Não',
      onConfirm: () => deleteSelectedMedicalGroup(group),
    });
  };

  const handleSubmitMedicalGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      return;
    }

    if (!formData.nome.trim()) {
      setFormError('Informe o nome do grupo.');
      return;
    }

    if (!formData.medicoUserIds.length) {
      setFormError('Selecione ao menos um médico para o grupo.');
      return;
    }

    setFormError('');
    setGroupsError('');
    setSuccessMessage('');

    try {
      await resources.saveMutation.mutateAsync({
        id: editingGroupId,
        payload: {
          nome: formData.nome.trim(),
          ativo: formData.ativo,
          medicoUserIds: formData.medicoUserIds,
        },
        token: session.token,
      });
      setSuccessMessage(editingGroupId ? 'Grupo médico atualizado.' : 'Grupo médico cadastrado.');
      openMedicalGroupsList();
      await loadMedicalGroups(session.token, true);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return {
    groups,
    groupsLoading,
    groupsError,
    successMessage,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    totalItems,
    medicalGroupsCount,
    totalPages,
    visibleStart,
    visibleEnd,
    editingGroupId,
    formData,
    setFormData,
    formError,
    formLoading,
    availableMedicalUsers,
    resetMedicalGroupsState,
    loadMedicalGroups,
    openMedicalGroupsList,
    openNewMedicalGroupForm,
    closeMedicalGroupForm: openMedicalGroupsList,
    handleEditMedicalGroup,
    handleDeleteMedicalGroup,
    handleSubmitMedicalGroup,
  };
}

export type MedicalGroupsDomainState = ReturnType<typeof useMedicalGroupsDomain>;
