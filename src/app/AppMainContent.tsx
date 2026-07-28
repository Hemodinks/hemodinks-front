import { Suspense } from 'react';
import type { AppView, ModuleMode, Theme } from '../appTypes';
import { DashboardPage } from '../features/dashboard';
import type { MedicalGroupsDomainState } from '../features/medicalGroups';
import type { PatientsDomainState } from '../features/patients';
import type { UsersDomainState } from '../features/users';
import type { AuthSession } from '../shared/domain/sessionTypes';
import type { SelectClinicResponse } from '../shared/domain/clinicContracts';
import {
  AgendaPage,
  BillingPage,
  ClinicsPage,
  MedicalGroupsPage,
  ModuleFallback,
  PatientsContainer,
  SystemSettingsPage,
  UsersContainer,
} from './lazyModules';

type AccessState = {
  canAccessPatients: boolean;
  canAccessUsers: boolean;
  canEditOwnUser: boolean;
  canAccessBilling: boolean;
  canAccessMedicalGroups: boolean;
  canAccessAgenda: boolean;
  canAccessSettings: boolean;
  canCreatePatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;
  canManagePatientObservacoes: boolean;
  patientReadOnly: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isMedical: boolean;
  canAccessClinics: boolean;
};

type DashboardCounts = {
  usersCount: number;
  pacientesCount: number;
  activeUsersCount: number;
  activePatientsCount: number;
  pendingPaymentsCount: number;
  patientFilesCount: number;
  upcomingEventsCount: number;
  unreadAgendaNotificationCount: number;
};

type NavigationActions = {
  openUsersList: () => void;
  openMyProfile: () => void;
  openPatientsList: () => void;
  openBilling: () => void;
  openAttendances: () => void;
  openFinance: () => void;
  openPrices: () => void;
  openMedicalGroups: () => void;
  openAgenda: () => void;
  openSettings: () => void;
  openClinics: () => void;
};

type SortHandlers = {
  handleUserSortChange: (field: string) => void;
  handlePacienteSortChange: (field: string) => void;
  handleMedicalGroupSortChange: (field: string) => void;
};

type AppMainContentProps = {
  session: AuthSession;
  activeView: AppView;
  moduleMode: ModuleMode;
  companyName: string;
  access: AccessState;
  counts: DashboardCounts;
  usersDomain: UsersDomainState;
  patientsDomain: PatientsDomainState;
  medicalGroupsDomain: MedicalGroupsDomainState;
  dashboardError: string;
  theme: Theme;
  navigation: NavigationActions;
  sortHandlers: SortHandlers;
  onThemeChange: (theme: Theme) => void;
  onPasswordChanged: (message: string) => void;
  onClinicSelected: (result: SelectClinicResponse) => void;
};

export function AppMainContent({
  session,
  activeView,
  moduleMode,
  companyName,
  access,
  counts,
  usersDomain,
  patientsDomain,
  medicalGroupsDomain,
  dashboardError,
  theme,
  navigation,
  sortHandlers,
  onThemeChange,
  onPasswordChanged,
  onClinicSelected,
}: AppMainContentProps) {
  const {
    canAccessPatients,
    canAccessUsers,
    canEditOwnUser,
    canAccessBilling,
    canAccessMedicalGroups,
    canAccessAgenda,
    canAccessSettings,
    canCreatePatients,
    canEditPatients,
    canDeletePatients,
    canManagePatientObservacoes,
    patientReadOnly,
    isAdmin,
    isSuperAdmin,
    isMedical,
    canAccessClinics,
  } = access;
  const {
    usersCount,
    pacientesCount,
    activeUsersCount,
    activePatientsCount,
    pendingPaymentsCount,
    patientFilesCount,
    upcomingEventsCount,
    unreadAgendaNotificationCount,
  } = counts;

  return (
    <Suspense fallback={<ModuleFallback />}>
      {activeView === 'dashboard' ? (
        <DashboardPage
          companyName={companyName}
          canAccessPatients={canAccessPatients}
          canAccessUsers={canAccessUsers}
          canEditOwnUser={canEditOwnUser}
          canAccessBilling={canAccessBilling}
          canAccessMedicalGroups={canAccessMedicalGroups}
          canAccessAgenda={canAccessAgenda}
          canAccessSettings={canAccessSettings}
          canAccessClinics={canAccessClinics}
          isSuperAdmin={isSuperAdmin}
          patientReadOnly={patientReadOnly}
          usersCount={usersCount}
          pacientesCount={pacientesCount}
          activeUsersCount={activeUsersCount}
          activePatientsCount={activePatientsCount}
          pendingPaymentsCount={pendingPaymentsCount}
          patientFilesCount={patientFilesCount}
          upcomingEventsCount={upcomingEventsCount}
          unreadAgendaNotificationCount={unreadAgendaNotificationCount}
          successMessage={usersDomain.successMessage}
          dashboardError={dashboardError}
          onOpenUsersList={navigation.openUsersList}
          onOpenMyProfile={navigation.openMyProfile}
          onOpenPatientsList={navigation.openPatientsList}
          onOpenController={navigation.openAttendances}
          onOpenClinics={navigation.openClinics}
          onOpenMedicalGroups={navigation.openMedicalGroups}
          onOpenAgenda={navigation.openAgenda}
          onOpenSettings={navigation.openSettings}
        />
      ) : activeView === 'users' || activeView === 'profile' ? (
        <UsersContainer
          moduleMode={moduleMode}
          domain={usersDomain}
          canAccessUsers={canAccessUsers}
          canAssignAllProfiles={isSuperAdmin}
          sessionToken={session.token}
          onSortChange={sortHandlers.handleUserSortChange}
        />
      ) : activeView === 'patients' ? (
        <PatientsContainer
          moduleMode={moduleMode}
          domain={patientsDomain}
          access={{
            canCreatePatients,
            canEditPatients,
            canDeletePatients,
            canManageObservacoes: canManagePatientObservacoes,
            patientReadOnly,
            isAdmin,
            isMedical,
          }}
          sessionToken={session.token}
          onSortChange={sortHandlers.handlePacienteSortChange}
        />
      ) : activeView === 'clinics' && canAccessClinics ? (
        <ClinicsPage
          session={session}
          isSuperAdmin={isSuperAdmin}
          onClinicSelected={onClinicSelected}
        />
      ) : ['attendances', 'billing', 'finance', 'prices'].includes(activeView) ? (
        <BillingPage
          key={activeView}
          session={session}
          medicalUsers={patientsDomain.medicalUsers}
          convenios={patientsDomain.convenios}
          opmeFornecedores={patientsDomain.opmeFornecedores}
          isAdmin={isAdmin}
          isMedical={isMedical}
          section={
            activeView === 'attendances'
              ? 'atendimentos'
              : activeView === 'finance'
                ? 'financeiro'
                : activeView === 'prices'
                  ? 'precos'
                  : 'faturamento'
          }
        />
      ) : activeView === 'medicalGroups' ? (
        <MedicalGroupsPage
          moduleMode={moduleMode}
          groups={medicalGroupsDomain.groups}
          groupsLoading={medicalGroupsDomain.groupsLoading}
          groupsError={medicalGroupsDomain.groupsError}
          successMessage={medicalGroupsDomain.successMessage}
          totalItems={medicalGroupsDomain.totalItems}
          visibleStart={medicalGroupsDomain.visibleStart}
          visibleEnd={medicalGroupsDomain.visibleEnd}
          currentPage={medicalGroupsDomain.currentPage}
          totalPages={medicalGroupsDomain.totalPages}
          searchTerm={medicalGroupsDomain.searchTerm}
          sortBy={medicalGroupsDomain.sortBy}
          sortDirection={medicalGroupsDomain.sortDirection}
          editingGroupId={medicalGroupsDomain.editingGroupId}
          formData={medicalGroupsDomain.formData}
          formError={medicalGroupsDomain.formError}
          formLoading={medicalGroupsDomain.formLoading}
          availableMedicalUsers={medicalGroupsDomain.availableMedicalUsers}
          setFormData={medicalGroupsDomain.setFormData}
          setSearchTerm={medicalGroupsDomain.setSearchTerm}
          setCurrentPage={medicalGroupsDomain.setCurrentPage}
          onSortChange={sortHandlers.handleMedicalGroupSortChange}
          onCloseForm={medicalGroupsDomain.closeMedicalGroupForm}
          onOpenNewForm={medicalGroupsDomain.openNewMedicalGroupForm}
          onSubmit={medicalGroupsDomain.handleSubmitMedicalGroup}
          onEditGroup={medicalGroupsDomain.handleEditMedicalGroup}
          onDeleteGroup={medicalGroupsDomain.handleDeleteMedicalGroup}
          onRefresh={() => {
            void medicalGroupsDomain.loadMedicalGroups(session.token, true);
          }}
        />
      ) : activeView === 'settings' ? (
        <SystemSettingsPage
          session={session}
          theme={theme}
          onThemeChange={onThemeChange}
          onPasswordChanged={onPasswordChanged}
        />
      ) : (
        <AgendaPage session={session} isAdmin={isAdmin} isMedical={isMedical} />
      )}
    </Suspense>
  );
}
