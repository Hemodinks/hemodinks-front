import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../../services';
import type { AppView, ModuleMode } from '../../appTypes';
import { queryClient } from '../../queryClient';
import { queryKeys } from '../../shared/queryKeys';
import {
  formatProfileName,
  getErrorMessage,
  PAGE_SIZE,
} from '../../shared/utils/formatters';
import {
  getPagedItems,
  getPagedTotal,
  getPagedTotalPages,
  sortUsersForListing,
} from '../../shared/utils/listing';
import type { AuthSession, User } from '../../types';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import { useUserForm } from './useUserForm';
import { useUserList } from './useUserList';
import { useUserFiles } from './useUserFiles';
import { useUserCommands } from './useUserCommands';

const LIST_CACHE_TIME_MS = 20 * 1000;

type UseUsersDomainOptions = {
  session: AuthSession | null;
  activeView: AppView;
  moduleMode: ModuleMode;
  canAccessUsers: boolean;
  canEditOwnUser: boolean;
  isAdmin: boolean;
  setModuleMode: Dispatch<SetStateAction<ModuleMode>>;
  navigateToView: (view: AppView, replace?: boolean) => void;
  persistSession: (nextSession: AuthSession) => void;
  loadDashboardSummary: (token?: string, forceRefresh?: boolean) => Promise<void>;
  onDeleteCurrentUser: () => void;
  confirmAction: ConfirmAction;
};

export function useUsersDomain({
  session,
  activeView,
  moduleMode,
  canAccessUsers,
  canEditOwnUser,
  isAdmin,
  setModuleMode,
  navigateToView,
  persistSession,
  loadDashboardSummary,
  onDeleteCurrentUser,
  confirmAction,
}: UseUsersDomainOptions) {
  const userList = useUserList();
  const userForm = useUserForm();
  const userFiles = useUserFiles(session, userForm);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedInfoUser, setSelectedInfoUser] = useState<User | null>(null);
  const [selectedContactUser, setSelectedContactUser] = useState<User | null>(null);
  const skipProfileAutoOpenRef = useRef(false);

  const {
    users,
    setUsers,
    usersLoading,
    setUsersLoading,
    usersError,
    setUsersError,
    successMessage,
    setSuccessMessage,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    debouncedSearchTerm,
    usersTotalItems,
    setUsersTotalItems,
    usersTotalPages,
    setUsersTotalPages,
    totalPages,
    paginatedUsers,
    visibleStart,
    visibleEnd,
    resetUserListState,
  } = userList;
  const {
    formData,
    setFormData,
    editingId,
    editingUserDetails,
    formLoading,
    formError,
    photoInputKey,
    userFileInputKey,
    pendingUserFiles,
    resetUserForm,
  } = userForm;
  const canUseUserForm = isAdmin || (canEditOwnUser && editingId === session?.user.id);
  const usersQueryParams = useMemo(() => ({
    page: currentPage,
    pageSize: PAGE_SIZE,
    search: debouncedSearchTerm,
    sortBy,
    sortDirection,
  }), [currentPage, debouncedSearchTerm, sortBy, sortDirection]);
  const usersQueryEnabled = Boolean(session && !session.user.precisaTrocarSenha && canAccessUsers && activeView === 'users' && moduleMode === 'list');
  const usersQuery = useQuery({
    queryKey: queryKeys.users(session?.token ?? '', usersQueryParams),
    queryFn: () => getUsers(session?.token ?? '', usersQueryParams),
    enabled: usersQueryEnabled,
    staleTime: LIST_CACHE_TIME_MS,
  });

  useEffect(() => {
    setUsersLoading(usersQuery.isFetching);
  }, [setUsersLoading, usersQuery.isFetching]);

  useEffect(() => {
    if (!usersQuery.data) {
      return;
    }

    setUsers(sortUsersForListing(getPagedItems(usersQuery.data)));
    setUsersTotalItems(getPagedTotal(usersQuery.data));
    setUsersTotalPages(getPagedTotalPages(usersQuery.data));
    setUsersError('');
  }, [setUsers, setUsersError, setUsersTotalItems, setUsersTotalPages, usersQuery.data]);

  useEffect(() => {
    if (usersQuery.error) {
      setUsersError(getErrorMessage(usersQuery.error));
    }
  }, [setUsersError, usersQuery.error]);

  const refreshUserList = async (forceRefresh = false) => {
    if (!session) {
      return;
    }

    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.usersRoot(session.token) });
    }

    await usersQuery.refetch();
  };

  const userCommands = useUserCommands({
    session,
    canAccessUsers,
    canUseUserForm,
    isAdmin,
    userForm,
    userList,
    setModuleMode,
    navigateToView,
    persistSession,
    refreshUserList,
    loadDashboardSummary,
    onDeleteCurrentUser,
    confirmAction,
  });

  const resetUsersState = () => {
    userCommands.cancelUserFormRequest();
    resetUserListState();
    setSelectedInfoUser(null);
    setSelectedContactUser(null);
    setShowPasswordModal(false);
    resetUserForm();
  };

  const handlePasswordChanged = (message: string) => {
    if (!session) {
      return;
    }

    const nextSession = {
      ...session,
      user: {
        ...session.user,
        precisaTrocarSenha: false,
      },
    };

    persistSession(nextSession);
    setShowPasswordModal(false);
    setSuccessMessage(message);
  };

  const openUsersList = () => {
    resetUserFormState({ suppressProfileAutoOpen: true });

    if (!canAccessUsers) {
      navigateToView('dashboard');
      return;
    }

    navigateToView('users');
  };

  const openNewUserForm = () => {
    if (!canAccessUsers) {
      return;
    }

    resetUserForm();
    setSuccessMessage('');
    navigateToView('users');
    setModuleMode('form');
  };

  const closeUserForm = () => {
    userCommands.cancelUserFormRequest();
    resetUserForm();
    setModuleMode('list');

    if (!canAccessUsers) {
      skipProfileAutoOpenRef.current = true;
      navigateToView('dashboard');
    }
  };

  const resetUserFormState = (options?: { suppressProfileAutoOpen?: boolean }) => {
    if (options?.suppressProfileAutoOpen) {
      skipProfileAutoOpenRef.current = true;
    }

    userCommands.cancelUserFormRequest();
    resetUserForm();
    setModuleMode('list');
  };

  const openMyProfile = () => {
    if (!session || !canEditOwnUser) {
      return;
    }

    skipProfileAutoOpenRef.current = false;

    void userCommands.handleEditUser({
      id: session.user.id,
      nome: session.user.nome,
      email: session.user.email,
      telefone: '',
      cpf: session.user.cpf ?? null,
      crm: session.user.crm ?? null,
      crmUf: session.user.crmUf ?? null,
      fotoPerfil: session.user.fotoPerfil ?? null,
      dataCadastro: '',
      dataNascimento: '',
      ativo: true,
      precisaTrocarSenha: session.user.precisaTrocarSenha,
      perfilId: session.user.perfilId,
      perfilNome: formatProfileName(session.user.perfilId, session.user.perfilNome),
      arquivosCount: 0,
      arquivos: [],
    });
  };

  const refreshUsers = () => {
    void refreshUserList(true);
  };

  useEffect(() => {
    if (activeView !== 'profile') {
      skipProfileAutoOpenRef.current = false;
      return;
    }

    if (canEditOwnUser
      && session
      && !skipProfileAutoOpenRef.current
      && (moduleMode !== 'form' || editingId !== session.user.id)) {
      openMyProfile();
    }
  }, [activeView, canEditOwnUser, editingId, moduleMode, session?.user.id]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return {
    users,
    usersLoading,
    usersError,
    successMessage,
    setSuccessMessage,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    debouncedSearchTerm,
    usersTotalItems,
    usersTotalPages,
    totalPages,
    paginatedUsers,
    visibleStart,
    visibleEnd,
    formData,
    setFormData,
    editingId,
    editingUserDetails,
    formLoading,
    formError,
    photoInputKey,
    userFileInputKey,
    pendingUserFiles,
    showPasswordModal,
    setShowPasswordModal,
    selectedInfoUser,
    setSelectedInfoUser,
    selectedContactUser,
    setSelectedContactUser,
    canUseUserForm,
    resetUsersState,
    resetUserForm,
    handleEditUser: userCommands.handleEditUser,
    handleProfilePhotoChange: userFiles.handleProfilePhotoChange,
    handleRemoveProfilePhoto: userFiles.handleRemoveProfilePhoto,
    handleUserFilesChange: userFiles.handleFilesChange,
    removePendingUserFile: userFiles.removePendingFile,
    handleDeleteUserArquivo: userFiles.deleteFile,
    handleSubmitUser: userCommands.handleSubmitUser,
    handleDeleteUser: userCommands.handleDeleteUser,
    handlePasswordChanged,
    openUsersList,
    openNewUserForm,
    closeUserForm,
    resetUserFormState,
    openMyProfile,
    refreshUsers,
  };
}

export type UsersDomainState = ReturnType<typeof useUsersDomain>;
