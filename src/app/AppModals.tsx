import { type ReactNode, Suspense } from 'react';
import { ContactModal, InfoModal } from '../features/users/UserModals';
import type { PatientsDomainState } from '../features/patients/usePatientsDomain';
import type { UsersDomainState } from '../features/users/useUsersDomain';
import type { DashboardNotification, AuthSession } from '../types';
import {
  CbhpmLookupModal,
  NotificationsModal,
  PasswordModal,
  PatientFilesModal,
  PatientInfoModal,
  PatientObservacoesModal,
} from './lazyModules';

type AppModalsProps = {
  session: AuthSession;
  usersDomain: UsersDomainState;
  patientsDomain: PatientsDomainState;
  isAdmin: boolean;
  notificationsOpen: boolean;
  notifications: DashboardNotification[];
  notificationsLoading: boolean;
  notificationsError: string;
  notificationCount: number;
  onCloseNotifications: () => void;
  onOpenObservation: (pacienteId: number) => void;
  onCbhpmSortChange: (field: string) => void;
  onPasswordChanged: (message: string) => void;
  confirmationDialog: ReactNode;
};

export function AppModals({
  session,
  usersDomain,
  patientsDomain,
  isAdmin,
  notificationsOpen,
  notifications,
  notificationsLoading,
  notificationsError,
  notificationCount,
  onCloseNotifications,
  onOpenObservation,
  onCbhpmSortChange,
  onPasswordChanged,
  confirmationDialog,
}: AppModalsProps) {
  return (
    <Suspense fallback={null}>
      {usersDomain.selectedInfoUser && (
        <InfoModal user={usersDomain.selectedInfoUser} onClose={() => usersDomain.setSelectedInfoUser(null)} />
      )}

      {usersDomain.selectedContactUser && (
        <ContactModal user={usersDomain.selectedContactUser} onClose={() => usersDomain.setSelectedContactUser(null)} />
      )}

      {notificationsOpen && (
        <NotificationsModal
          notifications={notifications}
          loading={notificationsLoading}
          error={notificationsError}
          totalCount={notificationCount}
          onOpenObservation={onOpenObservation}
          onClose={onCloseNotifications}
        />
      )}

      {patientsDomain.cbhpmModalOpen && (
        <CbhpmLookupModal
          items={patientsDomain.cbhpmItems}
          filters={patientsDomain.cbhpmFilters}
          isAdmin={isAdmin}
          loading={patientsDomain.cbhpmLoading}
          error={patientsDomain.cbhpmError}
          canSearch={patientsDomain.canSearchCbhpm}
          filterHint={patientsDomain.cbhpmFilterHint}
          currentPage={patientsDomain.cbhpmCurrentPage}
          totalPages={patientsDomain.cbhpmTotalPageCount}
          totalItems={patientsDomain.cbhpmTotalItems}
          visibleStart={patientsDomain.cbhpmVisibleStart}
          visibleEnd={patientsDomain.cbhpmVisibleEnd}
          sortBy={patientsDomain.cbhpmSortBy}
          sortDirection={patientsDomain.cbhpmSortDirection}
          onFiltersChange={patientsDomain.setCbhpmFilters}
          onPageChange={patientsDomain.setCbhpmCurrentPage}
          onSortChange={onCbhpmSortChange}
          onRefresh={patientsDomain.refreshCbhpm}
          onSelect={patientsDomain.handleSelectCbhpm}
          onClose={() => patientsDomain.setCbhpmModalOpen(false)}
        />
      )}

      {patientsDomain.selectedPatientInfo && (
        <PatientInfoModal paciente={patientsDomain.selectedPatientInfo} onClose={() => patientsDomain.setSelectedPatientInfo(null)} />
      )}

      {patientsDomain.selectedPatientFiles && (
        <PatientFilesModal
          paciente={patientsDomain.selectedPatientFiles}
          loading={patientsDomain.patientFilesModalLoading}
          error={patientsDomain.patientFilesModalError}
          onClose={patientsDomain.closePatientFilesModal}
        />
      )}

      {patientsDomain.selectedPatientObservacoes && (
        <PatientObservacoesModal
          paciente={patientsDomain.selectedPatientObservacoes}
          observacoes={patientsDomain.patientObservacoes}
          loading={patientsDomain.patientObservacoesLoading}
          saving={patientsDomain.patientObservacoesSaving}
          error={patientsDomain.patientObservacoesError}
          draft={patientsDomain.patientObservationDraft}
          replyTo={patientsDomain.patientObservationReplyTo}
          onDraftChange={patientsDomain.setPatientObservationDraft}
          onReplyToChange={patientsDomain.setPatientObservationReplyTo}
          onRefresh={() => void patientsDomain.handleOpenPacienteObservacoes(patientsDomain.selectedPatientObservacoes!)}
          onSubmit={() => void patientsDomain.handleSubmitPacienteObservacao()}
          onClose={patientsDomain.closePatientObservacoesModal}
        />
      )}

      {usersDomain.showPasswordModal && (
        <PasswordModal
          session={session}
          onChanged={onPasswordChanged}
          onClose={() => usersDomain.setShowPasswordModal(false)}
        />
      )}

      {confirmationDialog}
    </Suspense>
  );
}
