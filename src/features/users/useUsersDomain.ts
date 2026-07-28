import { type Dispatch, type SetStateAction, useState } from 'react';
import type { AppView, ModuleMode } from '../../appTypes';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import type { User } from './userTypes';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import { useUserForm } from './useUserForm';
import { useUserList } from './useUserList';
import { useUserFiles } from './useUserFiles';
import { useUserCommands } from './useUserCommands';
import { useUsersQuery } from './useUsersQuery';
import { useUsersNavigation } from './useUsersNavigation';

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

  const {
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
    resetUserListState,
  } = userList;
  const {
    formData,
    setFormData,
    editingId,
    editingUserDetails,
    formError,
    photoInputKey,
    userFileInputKey,
    pendingUserFiles,
    resetUserForm,
  } = userForm;
  const canUseUserForm = isAdmin || (canEditOwnUser && editingId === session?.user.id);
  const refreshUserList = useUsersQuery({
    session,
    activeView,
    moduleMode,
    canAccessUsers,
    userList,
  });

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
  const formLoading = userCommands.formLoading;
  const navigation = useUsersNavigation({
    session,
    activeView,
    moduleMode,
    canAccessUsers,
    canEditOwnUser,
    editingId,
    currentPage,
    totalPages,
    setCurrentPage,
    setModuleMode,
    navigateToView,
    persistSession,
    setSuccessMessage,
    setShowPasswordModal,
    resetUserForm,
    userCommands,
    refreshUserList,
  });

  const resetUsersState = () => {
    userCommands.cancelUserFormRequest();
    resetUserListState();
    setSelectedInfoUser(null);
    setSelectedContactUser(null);
    setShowPasswordModal(false);
    resetUserForm();
  };

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
    handlePasswordChanged: navigation.handlePasswordChanged,
    openUsersList: navigation.openUsersList,
    openNewUserForm: navigation.openNewUserForm,
    closeUserForm: navigation.closeUserForm,
    resetUserFormState: navigation.resetUserFormState,
    openMyProfile: navigation.openMyProfile,
    refreshUsers: navigation.refreshUsers,
  };
}

export type UsersDomainState = ReturnType<typeof useUsersDomain>;
