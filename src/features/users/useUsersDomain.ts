import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createUser,
  deleteUser,
  deleteUserArquivo,
  getUser,
  getUsers,
  updateUser,
  uploadUserArquivo,
} from '../../services';
import type { AppView, ModuleMode } from '../../appTypes';
import { queryClient } from '../../queryClient';
import { queryKeys } from '../../shared/queryKeys';
import { readProfilePhoto } from '../../shared/utils/files';
import {
  ALLOWED_PATIENT_FILE_TYPES,
  ALLOWED_PROFILE_PHOTO_TYPES,
  DEFAULT_PASSWORD,
  DEFAULT_PROFILE_ID,
  getErrorMessage,
  getProfileName,
  MAX_PATIENT_FILE_BYTES,
  MAX_PROFILE_PHOTO_BYTES,
  MEDICAL_PROFILE_ID,
  PAGE_SIZE,
} from '../../shared/utils/formatters';
import {
  getPagedItems,
  getPagedTotal,
  getPagedTotalPages,
  sortUsersForListing,
} from '../../shared/utils/listing';
import type { AuthSession, User, UserFormData, UserPayload } from '../../types';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import {
  toUserPayload,
  validateUserForm,
} from './userUtils';
import { useUserForm } from './useUserForm';
import { useUserList } from './useUserList';

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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedInfoUser, setSelectedInfoUser] = useState<User | null>(null);
  const [selectedContactUser, setSelectedContactUser] = useState<User | null>(null);
  const skipProfileAutoOpenRef = useRef(false);
  const userFormRequestRef = useRef(0);

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
    setEditingUserDetails,
    formLoading,
    setFormLoading,
    formError,
    setFormError,
    photoInputKey,
    setPhotoInputKey,
    userFileInputKey,
    pendingUserFiles,
    setPendingUserFiles,
    resetUserForm,
    applyUserToForm,
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
  const saveUserMutation = useMutation({
    mutationFn: ({ id, payload, token }: { id: number | null; payload: UserPayload; token: string }) => (
      id ? updateUser(id, payload, token) : createUser(payload, token)
    ),
  });
  const deleteUserMutation = useMutation({
    mutationFn: ({ id, token }: { id: number; token: string }) => deleteUser(id, token),
  });
  const deleteUserArquivoMutation = useMutation({
    mutationFn: ({ userId, arquivoId, token }: { userId: number; arquivoId: number; token: string }) => (
      deleteUserArquivo(userId, arquivoId, token)
    ),
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

  const cancelUserFormRequest = () => {
    userFormRequestRef.current += 1;
    setFormLoading(false);
  };

  const resetUsersState = () => {
    cancelUserFormRequest();
    resetUserListState();
    setSelectedInfoUser(null);
    setSelectedContactUser(null);
    setShowPasswordModal(false);
    resetUserForm();
  };

  const handleEditUser = async (user: User) => {
    if (!session) {
      return;
    }

    const requestId = userFormRequestRef.current + 1;
    userFormRequestRef.current = requestId;
    applyUserToForm(user);
    setEditingUserDetails(user);
    setFormError('');
    setSuccessMessage('');
    setPendingUserFiles([]);
    navigateToView(canAccessUsers ? 'users' : 'profile');
    setModuleMode('form');

    try {
      setFormLoading(true);
      const details = await getUser(user.id, session.token);
      if (userFormRequestRef.current !== requestId) {
        return;
      }

      setEditingUserDetails(details);
      applyUserToForm(details);
    } catch (error) {
      if (userFormRequestRef.current !== requestId) {
        return;
      }

      setFormError(getErrorMessage(error));
    } finally {
      if (userFormRequestRef.current === requestId) {
        setFormLoading(false);
      }
    }
  };

  const handleProfilePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
      setFormError('Use uma foto PNG, JPG ou WEBP.');
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setFormError('A foto deve ter no maximo 1 MB.');
      return;
    }

    try {
      const fotoPerfil = await readProfilePhoto(file);
      setFormData((current) => ({ ...current, fotoPerfil }));
      setFormError('');
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleRemoveProfilePhoto = () => {
    setFormData((current) => ({ ...current, fotoPerfil: null }));
    setPhotoInputKey((key) => key + 1);
  };

  const handleUserFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (!files.length) {
      return;
    }

    const invalidFile = files.find((file) => !ALLOWED_PATIENT_FILE_TYPES.has(file.type) || file.size > MAX_PATIENT_FILE_BYTES);

    if (invalidFile) {
      setFormError('Use PDF, DOC, DOCX, JPG, JPEG, PNG, XLS, XLSX, TXT, CSV, PPT ou PPTX de ate 10 MB.');
      return;
    }

    setPendingUserFiles((current) => [...current, ...files]);
    setFormError('');
  };

  const removePendingUserFile = (indexToRemove: number) => {
    setPendingUserFiles((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const handleDeleteUserArquivo = async (user: User, arquivoId: number) => {
    if (!session) {
      return;
    }

    setFormError('');

    try {
      await deleteUserArquivoMutation.mutateAsync({ userId: user.id, arquivoId, token: session.token });
      const details = await getUser(user.id, session.token);
      setEditingUserDetails(details);
      applyUserToForm(details);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleSubmitUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      return;
    }

    if (!canUseUserForm && !isAdmin) {
      setFormError('Sem permissao para editar este cadastro.');
      return;
    }

    const validationError = validateUserForm(formData);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = toUserPayload(formData);

    setFormLoading(true);
    setFormError('');
    setSuccessMessage('');

    try {
      let savedUser: User;

      if (editingId) {
        savedUser = await saveUserMutation.mutateAsync({ id: editingId, payload, token: session.token });
        setSuccessMessage('Usuario atualizado.');
      } else {
        savedUser = await saveUserMutation.mutateAsync({ id: null, payload, token: session.token });
        setSuccessMessage(`Usuario cadastrado com senha inicial ${DEFAULT_PASSWORD}.`);
      }

      if (savedUser.perfilId === MEDICAL_PROFILE_ID) {
        for (const file of pendingUserFiles) {
          await uploadUserArquivo(savedUser.id, file, session.token);
        }
      }

      setUsers((current) => sortUsersForListing(
        editingId
          ? current.map((user) => (user.id === savedUser.id ? savedUser : user))
          : [savedUser, ...current],
      ));
      if (!editingId) {
        setUsersTotalItems((current) => current + 1);
      }

      if (editingId && savedUser.id === session.user.id) {
        persistSession({
          ...session,
          user: {
            ...session.user,
            nome: savedUser.nome,
            email: savedUser.email,
            cpf: savedUser.cpf ?? null,
            crm: savedUser.crm ?? null,
            crmUf: savedUser.crmUf ?? null,
            fotoPerfil: savedUser.fotoPerfil ?? null,
            perfilId: savedUser.perfilId || DEFAULT_PROFILE_ID,
            perfilNome: savedUser.perfilNome || getProfileName(savedUser.perfilId || DEFAULT_PROFILE_ID),
          },
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.usersRoot(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.medicalUsers(session.token) }),
      ]);
      resetUserForm();
      setCurrentPage(1);
      setModuleMode('list');
      await refreshUserList(true);
      if (!isAdmin) {
        navigateToView('dashboard');
      }
      await loadDashboardSummary(session.token, true);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
  };

  const deleteSelectedUser = async (user: User) => {
    if (!session) {
      return;
    }

    setUsersError('');
    setSuccessMessage('');

    try {
      await deleteUserMutation.mutateAsync({ id: user.id, token: session.token });

      if (user.id === session.user.id) {
        onDeleteCurrentUser();
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.usersRoot(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.medicalUsers(session.token) }),
      ]);
      setSuccessMessage('Usuario excluido.');
      await refreshUserList(true);
      await loadDashboardSummary(session.token, true);
    } catch (error) {
      setUsersError(getErrorMessage(error));
    }
  };

  const handleDeleteUser = (user: User) => {
    confirmAction({
      tone: 'delete',
      title: 'Excluir usuario?',
      message: `Deseja excluir "${user.nome}"? Esta acao nao podera ser desfeita.`,
      confirmLabel: 'Sim',
      cancelLabel: 'Nao',
      onConfirm: () => deleteSelectedUser(user),
    });
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
    cancelUserFormRequest();
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

    cancelUserFormRequest();
    resetUserForm();
    setModuleMode('list');
  };

  const openMyProfile = () => {
    if (!session || !canEditOwnUser) {
      return;
    }

    skipProfileAutoOpenRef.current = false;

    void handleEditUser({
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
      perfilNome: session.user.perfilNome,
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
    handleEditUser,
    handleProfilePhotoChange,
    handleRemoveProfilePhoto,
    handleUserFilesChange,
    removePendingUserFile,
    handleDeleteUserArquivo,
    handleSubmitUser,
    handleDeleteUser,
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
