import { type Dispatch, type FormEvent, type SetStateAction } from 'react';
import type { MedicalGroup, MedicalGroupFormData, MedicalUserOption } from '../../types';
import type { ModuleMode } from '../../appTypes';
import { MedicalGroupForm } from './MedicalGroupForm';
import { MedicalGroupList } from './MedicalGroupList';

type MedicalGroupsPageProps = {
  moduleMode: ModuleMode;
  groups: MedicalGroup[];
  groupsLoading: boolean;
  groupsError: string;
  successMessage: string;
  totalItems: number;
  visibleStart: number;
  visibleEnd: number;
  currentPage: number;
  totalPages: number;
  searchTerm: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  editingGroupId: number | null;
  formData: MedicalGroupFormData;
  formError: string;
  formLoading: boolean;
  availableMedicalUsers: MedicalUserOption[];
  setFormData: Dispatch<SetStateAction<MedicalGroupFormData>>;
  setSearchTerm: (value: string) => void;
  setCurrentPage: (page: number | ((current: number) => number)) => void;
  onSortChange: (field: string) => void;
  onCloseForm: () => void;
  onOpenNewForm: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEditGroup: (group: MedicalGroup) => void | Promise<void>;
  onDeleteGroup: (group: MedicalGroup) => void | Promise<void>;
  onRefresh: () => void;
};

export function MedicalGroupsPage({
  moduleMode,
  groups,
  groupsLoading,
  groupsError,
  successMessage,
  totalItems,
  visibleStart,
  visibleEnd,
  currentPage,
  totalPages,
  searchTerm,
  sortBy,
  sortDirection,
  editingGroupId,
  formData,
  formError,
  formLoading,
  availableMedicalUsers,
  setFormData,
  setSearchTerm,
  setCurrentPage,
  onSortChange,
  onCloseForm,
  onOpenNewForm,
  onSubmit,
  onEditGroup,
  onDeleteGroup,
  onRefresh,
}: MedicalGroupsPageProps) {
  return (
    <section className="workspace">
      {moduleMode === 'form' ? (
        <MedicalGroupForm
          editingGroupId={editingGroupId}
          formData={formData}
          formError={formError}
          formLoading={formLoading}
          availableMedicalUsers={availableMedicalUsers}
          setFormData={setFormData}
          onClose={onCloseForm}
          onSubmit={onSubmit}
        />
      ) : (
        <MedicalGroupList
          groups={groups}
          groupsLoading={groupsLoading}
          groupsError={groupsError}
          successMessage={successMessage}
          totalItems={totalItems}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          currentPage={currentPage}
          totalPages={totalPages}
          searchTerm={searchTerm}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSearchChange={setSearchTerm}
          onPageChange={setCurrentPage}
          onSortChange={onSortChange}
          onOpenNewForm={onOpenNewForm}
          onEditGroup={onEditGroup}
          onDeleteGroup={onDeleteGroup}
          onRefresh={onRefresh}
        />
      )}
    </section>
  );
}
