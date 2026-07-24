import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import type { User, UserFormData } from '../../types';
import { UserForm } from './UserForm';
import { UserList } from './UserList';
import './users.css';

type UsersPageProps = {
  moduleMode: 'list' | 'form';
  canAccessUsers: boolean;
  canUseUserForm: boolean;
  canAssignAllProfiles: boolean;
  editingId: number | null;
  editingUserDetails: User | null;
  formData: UserFormData;
  formError: string;
  formLoading: boolean;
  pendingUserFiles: File[];
  photoInputKey: number;
  userFileInputKey: number;
  users: User[];
  usersLoading: boolean;
  usersError: string;
  successMessage: string;
  usersTotalItems: number;
  visibleStart: number;
  visibleEnd: number;
  currentPage: number;
  totalPages: number;
  searchTerm: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  sessionToken: string;
  setFormData: Dispatch<SetStateAction<UserFormData>>;
  setSearchTerm: (value: string) => void;
  setCurrentPage: (page: number | ((current: number) => number)) => void;
  onSortChange: (field: string) => void;
  closeUserForm: () => void;
  openNewUserForm: () => void;
  handleSubmitUser: (event: FormEvent<HTMLFormElement>) => void;
  handleProfilePhotoChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  handleRemoveProfilePhoto: () => void;
  handleUserFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  removePendingUserFile: (index: number) => void;
  handleDeleteUserArquivo: (user: User, arquivoId: number) => void | Promise<void>;
  handleEditUser: (user: User) => void | Promise<void>;
  handleDeleteUser: (user: User) => void | Promise<void>;
  setSelectedInfoUser: (user: User) => void;
  setSelectedContactUser: (user: User) => void;
  refreshUsers: () => void;
};

export function UsersPage({
  moduleMode,
  canAccessUsers,
  canUseUserForm,
  canAssignAllProfiles,
  editingId,
  editingUserDetails,
  formData,
  formError,
  formLoading,
  pendingUserFiles,
  photoInputKey,
  userFileInputKey,
  users,
  usersLoading,
  usersError,
  successMessage,
  usersTotalItems,
  visibleStart,
  visibleEnd,
  currentPage,
  totalPages,
  searchTerm,
  sortBy,
  sortDirection,
  sessionToken,
  setFormData,
  setSearchTerm,
  setCurrentPage,
  onSortChange,
  closeUserForm,
  openNewUserForm,
  handleSubmitUser,
  handleProfilePhotoChange,
  handleRemoveProfilePhoto,
  handleUserFilesChange,
  removePendingUserFile,
  handleDeleteUserArquivo,
  handleEditUser,
  handleDeleteUser,
  setSelectedInfoUser,
  setSelectedContactUser,
  refreshUsers,
}: UsersPageProps) {
  const shouldShowUserForm = moduleMode === 'form' || !canAccessUsers;

  return (
    <section className="workspace">
      {shouldShowUserForm ? (
        <UserForm
          canAccessUsers={canAccessUsers}
          canUseUserForm={canUseUserForm}
          canAssignAllProfiles={canAssignAllProfiles}
          editingId={editingId}
          editingUserDetails={editingUserDetails}
          formData={formData}
          formError={formError}
          formLoading={formLoading}
          pendingUserFiles={pendingUserFiles}
          photoInputKey={photoInputKey}
          userFileInputKey={userFileInputKey}
          sessionToken={sessionToken}
          setFormData={setFormData}
          onClose={closeUserForm}
          onSubmit={handleSubmitUser}
          onProfilePhotoChange={handleProfilePhotoChange}
          onRemoveProfilePhoto={handleRemoveProfilePhoto}
          onUserFilesChange={handleUserFilesChange}
          onRemovePendingUserFile={removePendingUserFile}
          onDeleteUserArquivo={handleDeleteUserArquivo}
        />
      ) : (
        <UserList
          users={users}
          usersLoading={usersLoading}
          usersError={usersError}
          successMessage={successMessage}
          usersTotalItems={usersTotalItems}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          currentPage={currentPage}
          totalPages={totalPages}
          searchTerm={searchTerm}
          sortBy={sortBy}
          sortDirection={sortDirection}
          sessionToken={sessionToken}
          onSearchChange={setSearchTerm}
          onPageChange={setCurrentPage}
          onSortChange={onSortChange}
          onRefresh={refreshUsers}
          onOpenNewUserForm={openNewUserForm}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
          onSelectInfoUser={setSelectedInfoUser}
          onSelectContactUser={setSelectedContactUser}
        />
      )}
    </section>
  );
}
