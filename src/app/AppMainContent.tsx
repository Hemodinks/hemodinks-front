import { Suspense } from "react";
import type { AppView, ModuleMode, Theme } from "../appTypes";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import type { MedicalGroupsDomainState } from "../features/medicalGroups/useMedicalGroupsDomain";
import type { PatientsDomainState } from "../features/patients/usePatientsDomain";
import type { UsersDomainState } from "../features/users/useUsersDomain";
import type { AuthSession, SelectClinicResponse } from "../types";
import {
  AgendaPage,
  BillingPage,
  ClinicsPage,
  MedicalGroupsPage,
  ModuleFallback,
  PatientsPage,
  SystemSettingsPage,
  UsersPage,
} from "./lazyModules";

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
      {activeView === "dashboard" ? (
        <DashboardPage
          companyName={companyName}
          canAccessPatients={canAccessPatients}
          canAccessUsers={canAccessUsers}
          canEditOwnUser={canEditOwnUser}
          canAccessBilling={canAccessBilling}
          canAccessMedicalGroups={canAccessMedicalGroups}
          canAccessAgenda={canAccessAgenda}
          canAccessSettings={canAccessSettings}
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
          onOpenBilling={navigation.openBilling}
          onOpenMedicalGroups={navigation.openMedicalGroups}
          onOpenAgenda={navigation.openAgenda}
          onOpenSettings={navigation.openSettings}
        />
      ) : activeView === "users" || activeView === "profile" ? (
        <UsersPage
          moduleMode={moduleMode}
          canAccessUsers={canAccessUsers}
          canUseUserForm={usersDomain.canUseUserForm}
          editingId={usersDomain.editingId}
          editingUserDetails={usersDomain.editingUserDetails}
          formData={usersDomain.formData}
          formError={usersDomain.formError}
          formLoading={usersDomain.formLoading}
          pendingUserFiles={usersDomain.pendingUserFiles}
          photoInputKey={usersDomain.photoInputKey}
          userFileInputKey={usersDomain.userFileInputKey}
          users={usersDomain.paginatedUsers}
          usersLoading={usersDomain.usersLoading}
          usersError={usersDomain.usersError}
          successMessage={usersDomain.successMessage}
          usersTotalItems={usersDomain.usersTotalItems}
          visibleStart={usersDomain.visibleStart}
          visibleEnd={usersDomain.visibleEnd}
          currentPage={usersDomain.currentPage}
          totalPages={usersDomain.totalPages}
          searchTerm={usersDomain.searchTerm}
          sortBy={usersDomain.sortBy}
          sortDirection={usersDomain.sortDirection}
          sessionToken={session.token}
          setFormData={usersDomain.setFormData}
          setSearchTerm={usersDomain.setSearchTerm}
          setCurrentPage={usersDomain.setCurrentPage}
          onSortChange={sortHandlers.handleUserSortChange}
          closeUserForm={usersDomain.closeUserForm}
          openNewUserForm={usersDomain.openNewUserForm}
          handleSubmitUser={usersDomain.handleSubmitUser}
          handleProfilePhotoChange={usersDomain.handleProfilePhotoChange}
          handleRemoveProfilePhoto={usersDomain.handleRemoveProfilePhoto}
          handleUserFilesChange={usersDomain.handleUserFilesChange}
          removePendingUserFile={usersDomain.removePendingUserFile}
          handleDeleteUserArquivo={usersDomain.handleDeleteUserArquivo}
          handleEditUser={usersDomain.handleEditUser}
          handleDeleteUser={usersDomain.handleDeleteUser}
          setSelectedInfoUser={usersDomain.setSelectedInfoUser}
          setSelectedContactUser={usersDomain.setSelectedContactUser}
          refreshUsers={usersDomain.refreshUsers}
        />
      ) : activeView === "patients" ? (
        <PatientsPage
          moduleMode={moduleMode}
          canCreatePatients={canCreatePatients}
          canEditPatients={canEditPatients}
          canDeletePatients={canDeletePatients}
          canManageObservacoes={canManagePatientObservacoes}
          patientReadOnly={patientReadOnly}
          editingPacienteId={patientsDomain.editingPacienteId}
          editingPaciente={patientsDomain.editingPaciente}
          pacienteFormData={patientsDomain.pacienteFormData}
          pacienteFormError={patientsDomain.pacienteFormError}
          pacienteFormLoading={patientsDomain.pacienteFormLoading}
          pendingPatientFiles={patientsDomain.pendingPatientFiles}
          patientFileInputKey={patientsDomain.patientFileInputKey}
          pacientes={patientsDomain.paginatedPacientes}
          pacientesLoading={patientsDomain.pacientesLoading}
          pacientesError={patientsDomain.pacientesError}
          pacienteSuccessMessage={patientsDomain.pacienteSuccessMessage}
          pacientesTotalItems={patientsDomain.pacientesTotalItems}
          pacienteVisibleStart={patientsDomain.pacienteVisibleStart}
          pacienteVisibleEnd={patientsDomain.pacienteVisibleEnd}
          pacienteCurrentPage={patientsDomain.pacienteCurrentPage}
          pacienteTotalPages={patientsDomain.pacienteTotalPages}
          pacienteSearchTerm={patientsDomain.pacienteSearchTerm}
          sortBy={patientsDomain.sortBy}
          sortDirection={patientsDomain.sortDirection}
          pacienteFilters={patientsDomain.pacienteFilters}
          pacienteExportLoading={patientsDomain.pacienteExportLoading}
          pacienteExportScope={patientsDomain.pacienteExportScope}
          hospitais={patientsDomain.hospitais}
          hospitaisError={patientsDomain.hospitaisError}
          medicalUsers={patientsDomain.medicalUsers}
          convenios={patientsDomain.convenios}
          conveniosError={patientsDomain.conveniosError}
          opmeFornecedores={patientsDomain.opmeFornecedores}
          opmeFornecedoresError={patientsDomain.opmeFornecedoresError}
          isAdmin={isAdmin}
          isMedical={isMedical}
          sessionToken={session.token}
          setPacienteFormData={patientsDomain.setPacienteFormData}
          setPacienteSearchTerm={patientsDomain.setPacienteSearchTerm}
          setPacienteFilters={patientsDomain.setPacienteFilters}
          setPacienteExportScope={patientsDomain.setPacienteExportScope}
          setPacienteCurrentPage={patientsDomain.setPacienteCurrentPage}
          onSortChange={sortHandlers.handlePacienteSortChange}
          closePacienteForm={patientsDomain.closePacienteForm}
          openNewPacienteForm={patientsDomain.openNewPacienteForm}
          handleSubmitPaciente={patientsDomain.handleSubmitPaciente}
          handleOpenCbhpmModal={patientsDomain.handleOpenCbhpmModal}
          handleRemovePacienteProcedimento={
            patientsDomain.handleRemovePacienteProcedimento
          }
          handlePacienteFilesChange={patientsDomain.handlePacienteFilesChange}
          removePendingPatientFile={patientsDomain.removePendingPatientFile}
          handleDeletePacienteArquivo={
            patientsDomain.handleDeletePacienteArquivo
          }
          handleExportPacientes={patientsDomain.handleExportPacientes}
          handleEditPaciente={patientsDomain.handleEditPaciente}
          handleDeletePaciente={patientsDomain.handleDeletePaciente}
          handleOpenPacienteFiles={patientsDomain.handleOpenPacienteFiles}
          handleOpenPacienteObservacoes={
            patientsDomain.handleOpenPacienteObservacoes
          }
          setSelectedPatientInfo={patientsDomain.setSelectedPatientInfo}
          clearPacienteFilters={patientsDomain.clearPacienteFilters}
          refreshPacientes={patientsDomain.refreshPacientes}
        />
      ) : activeView === "clinics" && canAccessClinics ? (
        <ClinicsPage session={session} onClinicSelected={onClinicSelected} />
      ) : ["attendances", "billing", "finance", "prices"].includes(
          activeView,
        ) ? (
        <BillingPage
          session={session}
          medicalUsers={patientsDomain.medicalUsers}
          convenios={patientsDomain.convenios}
          isAdmin={isAdmin}
          isMedical={isMedical}
          section={
            activeView === "attendances"
              ? "atendimentos"
              : activeView === "finance"
                ? "financeiro"
                : activeView === "prices"
                  ? "precos"
                  : "faturamento"
          }
        />
      ) : activeView === "medicalGroups" ? (
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
      ) : activeView === "settings" ? (
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
