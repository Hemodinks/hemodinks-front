import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createMedicalGroup,
  deleteMedicalGroup,
  getMedicalGroup,
  getMedicalGroups,
  getScopedMedicalUsers,
  updateMedicalGroup,
} from '../../api';
import type { AppView, ModuleMode } from '../../appTypes';
import { queryClient } from '../../queryClient';
import { queryKeys } from '../../shared/queryKeys';
import { getErrorMessage, PAGE_SIZE } from '../../shared/utils/formatters';
import { getPagedItems, getPagedTotal, getPagedTotalPages, sortUsersByName } from '../../shared/utils/listing';
import type { AuthSession, MedicalGroup, MedicalGroupFormData, MedicalUserOption } from '../../types';

const LIST_CACHE_TIME_MS = 20 * 1000;
const LOOKUP_CACHE_TIME_MS = 30 * 60 * 1000;

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
};

export function useMedicalGroupsDomain({
  session,
  activeView,
  moduleMode,
  canAccessMedicalGroups,
  setModuleMode,
  navigateToView,
}: UseMedicalGroupsDomainOptions) {
  const [groups, setGroups] = useState<MedicalGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
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
  const [formLoading, setFormLoading] = useState(false);
  const [availableMedicalUsers, setAvailableMedicalUsers] = useState<MedicalUserOption[]>([]);

  const sessionReady = Boolean(session && !session.user.precisaTrocarSenha && canAccessMedicalGroups);
  const groupsQueryParams = useMemo(() => ({
    page: currentPage,
    pageSize: PAGE_SIZE,
    search: searchTerm,
    sortBy,
    sortDirection,
  }), [currentPage, searchTerm, sortBy, sortDirection]);
  const groupsQuery = useQuery({
    queryKey: queryKeys.medicalGroups(session?.token ?? '', groupsQueryParams),
    queryFn: () => getMedicalGroups(session?.token ?? '', groupsQueryParams),
    enabled: sessionReady && activeView === 'medicalGroups' && moduleMode === 'list',
    staleTime: LIST_CACHE_TIME_MS,
  });
  const availableMedicalUsersQuery = useQuery({
    queryKey: queryKeys.medicalUsers(session?.token ?? ''),
    queryFn: () => getScopedMedicalUsers(session?.token ?? ''),
    enabled: sessionReady,
    staleTime: LOOKUP_CACHE_TIME_MS,
  });
  const saveMedicalGroupMutation = useMutation({
    mutationFn: ({ id, payload, token }: { id: number | null; payload: MedicalGroupFormData; token: string }) => (
      id ? updateMedicalGroup(id, payload, token) : createMedicalGroup(payload, token)
    ),
  });
  const deleteMedicalGroupMutation = useMutation({
    mutationFn: ({ id, token }: { id: number; token: string }) => deleteMedicalGroup(id, token),
  });

  useEffect(() => {
    setGroupsLoading(groupsQuery.isFetching);
  }, [groupsQuery.isFetching]);

  useEffect(() => {
    if (!groupsQuery.data) {
      return;
    }

    setGroups(getPagedItems(groupsQuery.data));
    setTotalItems(getPagedTotal(groupsQuery.data));
    setTotalPages(getPagedTotalPages(groupsQuery.data));
    setGroupsError('');
  }, [groupsQuery.data]);

  useEffect(() => {
    if (groupsQuery.error) {
      setGroupsError(getErrorMessage(groupsQuery.error));
    }
  }, [groupsQuery.error]);

  useEffect(() => {
    if (!availableMedicalUsersQuery.data) {
      return;
    }

    setAvailableMedicalUsers(sortUsersByName(availableMedicalUsersQuery.data));
  }, [availableMedicalUsersQuery.data]);

  useEffect(() => {
    if (availableMedicalUsersQuery.error) {
      setGroupsError(getErrorMessage(availableMedicalUsersQuery.error));
    }
  }, [availableMedicalUsersQuery.error]);

  const visibleStart = totalItems ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const visibleEnd = totalItems ? Math.min(totalItems, visibleStart + groups.length - 1) : 0;

  const resetForm = () => {
    setEditingGroupId(null);
    setFormData(emptyMedicalGroupForm);
    setFormError('');
  };

  const resetMedicalGroupsState = () => {
    setGroups([]);
    setGroupsLoading(false);
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

  const loadMedicalGroups = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.medicalGroupsRoot(token) });
    }

    await groupsQuery.refetch();
  };

  const loadAvailableMedicalUsers = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.medicalUsers(token) });
    }

    await availableMedicalUsersQuery.refetch();
  };

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
    setFormLoading(true);

    try {
      const details = await getMedicalGroup(group.id, session.token);
      setEditingGroupId(details.id);
      setFormData({
        nome: details.nome,
        ativo: details.ativo,
        medicoUserIds: details.membros.map((member) => member.userId),
      });
      await loadAvailableMedicalUsers(session.token);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteMedicalGroup = async (group: MedicalGroup) => {
    if (!session || !window.confirm(`Excluir ${group.nome}?`)) {
      return;
    }

    setGroupsError('');
    setSuccessMessage('');

    try {
      await deleteMedicalGroupMutation.mutateAsync({ id: group.id, token: session.token });
      setSuccessMessage('Grupo medico excluido.');
      await loadMedicalGroups(session.token, true);
    } catch (error) {
      setGroupsError(getErrorMessage(error));
    }
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
      setFormError('Selecione ao menos um medico para o grupo.');
      return;
    }

    setFormLoading(true);
    setFormError('');
    setGroupsError('');
    setSuccessMessage('');

    try {
      await saveMedicalGroupMutation.mutateAsync({
        id: editingGroupId,
        payload: {
          nome: formData.nome.trim(),
          ativo: formData.ativo,
          medicoUserIds: formData.medicoUserIds,
        },
        token: session.token,
      });
      setSuccessMessage(editingGroupId ? 'Grupo medico atualizado.' : 'Grupo medico cadastrado.');
      openMedicalGroupsList();
      await loadMedicalGroups(session.token, true);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setFormLoading(false);
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
