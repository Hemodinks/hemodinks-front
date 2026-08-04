import type { ModuleMode } from '../../appTypes';
import { UsersPage } from './UsersPage';
import type { UsersDomainState } from './useUsersDomain';

type UsersContainerProps = {
  moduleMode: ModuleMode;
  domain: UsersDomainState;
  canAccessUsers: boolean;
  canAssignAllProfiles: boolean;
  sessionToken: string;
  onSortChange: (field: string) => void;
};

export function UsersContainer({
  moduleMode,
  domain,
  canAccessUsers,
  canAssignAllProfiles,
  sessionToken,
  onSortChange,
}: UsersContainerProps) {
  return (
    <UsersPage
      moduleMode={moduleMode}
      canAccessUsers={canAccessUsers}
      canUseUserForm={domain.canUseUserForm}
      canAssignAllProfiles={canAssignAllProfiles}
      editingId={domain.editingId}
      editingUserDetails={domain.editingUserDetails}
      formData={domain.formData}
      formError={domain.formError}
      formLoading={domain.formLoading}
      pendingUserFiles={domain.pendingUserFiles}
      photoInputKey={domain.photoInputKey}
      userFileInputKey={domain.userFileInputKey}
      users={domain.paginatedUsers}
      usersLoading={domain.usersLoading}
      usersError={domain.usersError}
      successMessage={domain.successMessage}
      usersTotalItems={domain.usersTotalItems}
      visibleStart={domain.visibleStart}
      visibleEnd={domain.visibleEnd}
      currentPage={domain.currentPage}
      totalPages={domain.totalPages}
      searchTerm={domain.searchTerm}
      sortBy={domain.sortBy}
      sortDirection={domain.sortDirection}
      sessionToken={sessionToken}
      setFormData={domain.setFormData}
      setSearchTerm={domain.setSearchTerm}
      setCurrentPage={domain.setCurrentPage}
      onSortChange={onSortChange}
      closeUserForm={domain.closeUserForm}
      openNewUserForm={domain.openNewUserForm}
      handleSubmitUser={domain.handleSubmitUser}
      handleProfilePhotoChange={domain.handleProfilePhotoChange}
      handleRemoveProfilePhoto={domain.handleRemoveProfilePhoto}
      handleUserFilesChange={domain.handleUserFilesChange}
      removePendingUserFile={domain.removePendingUserFile}
      handleDeleteUserArquivo={domain.handleDeleteUserArquivo}
      handleEditUser={domain.handleEditUser}
      handleDeleteUser={domain.handleDeleteUser}
      setSelectedInfoUser={domain.setSelectedInfoUser}
      setSelectedContactUser={domain.setSelectedContactUser}
      refreshUsers={domain.refreshUsers}
    />
  );
}
