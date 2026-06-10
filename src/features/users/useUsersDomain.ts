import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction, useCallback, useEffect, useState } from 'react';
import {
  createUser,
  deleteUser,
  deleteUserArquivo,
  getUser,
  getUsers,
  updateUser,
  uploadUserArquivo,
} from '../../api';
import type { AppView, ModuleMode } from '../../appTypes';
import { queryClient } from '../../queryClient';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
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
import type { AuthSession, User, UserFormData } from '../../types';
import {
  emptyUserForm,
  getUserFormData,
  toUserPayload,
  validateUserForm,
} from './userUtils';

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
}: UseUsersDomainOptions) {
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const resetUsersPage = useCallback(() => setCurrentPage(1), []);
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, { onCommit: resetUsersPage });
  const [usersTotalItems, setUsersTotalItems] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);

  const [formData, setFormData] = useState<UserFormData>(emptyUserForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingUserDetails, setEditingUserDetails] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [userFileInputKey, setUserFileInputKey] = useState(0);
  const [pendingUserFiles, setPendingUserFiles] = useState<File[]>([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedInfoUser, setSelectedInfoUser] = useState<User | null>(null);
  const [selectedContactUser, setSelectedContactUser] = useState<User | null>(null);

  const canUseUserForm = isAdmin || (canEditOwnUser && editingId === session?.user.id);
  const totalPages = Math.max(1, usersTotalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const paginatedUsers = users;
  const visibleStart = usersTotalItems ? pageStart + 1 : 0;
  const visibleEnd = Math.min(pageEnd, usersTotalItems);

  const loadUsers = async (
    token = session?.token,
    page = currentPage,
    search = debouncedSearchTerm,
    forceRefresh = false,
  ) => {
    if (!token) {
      return;
    }

    setUsersLoading(true);
    setUsersError('');

    try {
      const query = {
        page,
        pageSize: PAGE_SIZE,
        search,
      };
      const result = await queryClient.fetchQuery({
        queryKey: ['users', token, query],
        queryFn: () => getUsers(token, query),
        staleTime: forceRefresh ? 0 : LIST_CACHE_TIME_MS,
      });
      setUsers(sortUsersForListing(getPagedItems(result)));
      setUsersTotalItems(getPagedTotal(result));
      setUsersTotalPages(getPagedTotalPages(result));
    } catch (error) {
      setUsersError(getErrorMessage(error));
    } finally {
      setUsersLoading(false);
    }
  };

  const resetUserForm = () => {
    setFormData(emptyUserForm);
    setEditingId(null);
    setEditingUserDetails(null);
    setFormError('');
    setPendingUserFiles([]);
    setPhotoInputKey((key) => key + 1);
    setUserFileInputKey((key) => key + 1);
  };

  const resetUsersState = () => {
    setUsers([]);
    setUsersError('');
    setUsersTotalItems(0);
    setUsersTotalPages(1);
    setSuccessMessage('');
    setSelectedInfoUser(null);
    setSelectedContactUser(null);
    setShowPasswordModal(false);
    resetUserForm();
  };

  const applyUserToForm = (user: User) => {
    setEditingId(user.id);
    setFormData(getUserFormData(user));
    setPhotoInputKey((key) => key + 1);
    setUserFileInputKey((key) => key + 1);
  };

  const handleEditUser = async (user: User) => {
    if (!session) {
      return;
    }

    applyUserToForm(user);
    setEditingUserDetails(user);
    setFormError('');
    setSuccessMessage('');
    setPendingUserFiles([]);
    navigateToView('users');
    setModuleMode('form');

    try {
      setFormLoading(true);
      const details = await getUser(user.id, session.token);
      setEditingUserDetails(details);
      applyUserToForm(details);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setFormLoading(false);
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
      await deleteUserArquivo(user.id, arquivoId, session.token);
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
        savedUser = await updateUser(editingId, payload, session.token);
        setSuccessMessage('Usuario atualizado.');
      } else {
        savedUser = await createUser(payload, session.token);
        setSuccessMessage(`Usuario cadastrado com senha inicial ${DEFAULT_PASSWORD}.`);
      }

      if (savedUser.perfilId === MEDICAL_PROFILE_ID) {
        for (const file of pendingUserFiles) {
          await uploadUserArquivo(savedUser.id, file, session.token);
        }
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
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary', session.token] }),
        queryClient.invalidateQueries({ queryKey: ['users', session.token] }),
        queryClient.invalidateQueries({ queryKey: ['medicalUsers', session.token] }),
      ]);
      resetUserForm();
      setCurrentPage(1);
      setModuleMode('list');
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

  const handleDeleteUser = async (user: User) => {
    if (!session || !window.confirm(`Excluir ${user.nome}?`)) {
      return;
    }

    setUsersError('');
    setSuccessMessage('');

    try {
      await deleteUser(user.id, session.token);

      if (user.id === session.user.id) {
        onDeleteCurrentUser();
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary', session.token] }),
        queryClient.invalidateQueries({ queryKey: ['users', session.token] }),
        queryClient.invalidateQueries({ queryKey: ['medicalUsers', session.token] }),
      ]);
      setSuccessMessage('Usuario excluido.');
      await loadUsers(session.token, currentPage, debouncedSearchTerm, true);
      await loadDashboardSummary(session.token, true);
    } catch (error) {
      setUsersError(getErrorMessage(error));
    }
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
    if (!canAccessUsers) {
      navigateToView('dashboard');
      setModuleMode('list');
      return;
    }

    navigateToView('users');
    setModuleMode('list');
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
    resetUserForm();
    setModuleMode('list');

    if (!canAccessUsers) {
      navigateToView('dashboard');
    }
  };

  const openMyProfile = () => {
    if (!session || !canEditOwnUser) {
      return;
    }

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
    if (session) {
      void loadUsers(session.token, currentPage, debouncedSearchTerm, true);
    }
  };

  useEffect(() => {
    if (session && !session.user.precisaTrocarSenha && canAccessUsers && activeView === 'users' && moduleMode === 'list') {
      void loadUsers(session.token, currentPage, debouncedSearchTerm);
    }
  }, [session?.token, session?.user.precisaTrocarSenha, canAccessUsers, activeView, moduleMode, currentPage, debouncedSearchTerm]);

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
    loadUsers,
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
    openMyProfile,
    refreshUsers,
  };
}
