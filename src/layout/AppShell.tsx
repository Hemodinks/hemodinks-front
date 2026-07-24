import type { ReactNode } from "react";
import type { AppView, BreadcrumbItem } from "../appTypes";
import type {
  AuthSession,
  Convenio,
  MedicalUserOption,
  OpmeFornecedor,
} from "../types";
import { LoadingOverlay } from "../shared/components/LoadingOverlay";
import {
  CONVENIOS_DATALIST_ID,
  MEDICAL_USERS_DATALIST_ID,
  OPME_FORNECEDORES_DATALIST_ID,
} from "../shared/utils/formatters";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { TutorialPanel } from "./TutorialPanel";

type AppShellProps = {
  children: ReactNode;
  modals?: ReactNode;
  session: AuthSession;
  isBusy: boolean;
  appTitle: string;
  companyName: string;
  companyPhoto?: string | null;
  activeView: AppView;
  breadcrumbItems: BreadcrumbItem[];
  notificationsOpen: boolean;
  notificationCount: number;
  currentUserProfile: string;
  canAccessDashboard: boolean;
  canAccessPatients: boolean;
  canAccessUsers: boolean;
  canEditOwnUser: boolean;
  canAccessBilling: boolean;
  canAccessMedicalGroups: boolean;
  canAccessSettings: boolean;
  canAccessAgenda: boolean;
  canAccessClinics: boolean;
  usersCount: number;
  pacientesCount: number;
  medicalGroupsCount: number;
  pendingPaymentsCount: number;
  unreadAgendaNotificationCount: number;
  medicalUsers: MedicalUserOption[];
  convenios: Convenio[];
  opmeFornecedores: OpmeFornecedor[];
  onToggleNotifications: () => void;
  onLogout: () => void;
  onOpenDashboard: () => void;
  onOpenUsersList: () => void;
  onOpenMyProfile: () => void;
  onOpenPatientsList: () => void;
  onOpenBilling: () => void;
  onOpenAttendances: () => void;
  onOpenFinance: () => void;
  onOpenPrices: () => void;
  onOpenMedicalGroups: () => void;
  onOpenAgenda: () => void;
  onOpenSettings: () => void;
  onOpenClinics: () => void;
};

export function AppShell({
  children,
  modals,
  session,
  isBusy,
  appTitle,
  companyName,
  companyPhoto,
  activeView,
  breadcrumbItems,
  notificationsOpen,
  notificationCount,
  currentUserProfile,
  canAccessDashboard,
  canAccessPatients,
  canAccessUsers,
  canEditOwnUser,
  canAccessBilling,
  canAccessMedicalGroups,
  canAccessSettings,
  canAccessAgenda,
  canAccessClinics,
  usersCount,
  pacientesCount,
  medicalGroupsCount,
  pendingPaymentsCount,
  unreadAgendaNotificationCount,
  medicalUsers,
  convenios,
  opmeFornecedores,
  onToggleNotifications,
  onLogout,
  onOpenDashboard,
  onOpenUsersList,
  onOpenMyProfile,
  onOpenPatientsList,
  onOpenBilling,
  onOpenAttendances,
  onOpenFinance,
  onOpenPrices,
  onOpenMedicalGroups,
  onOpenAgenda,
  onOpenSettings,
  onOpenClinics,
}: AppShellProps) {
  return (
    <main className="app-shell">
      <LoadingOverlay active={isBusy} />
      <datalist id={MEDICAL_USERS_DATALIST_ID}>
        {medicalUsers.map((user) => (
          <option key={user.id} value={user.nome} />
        ))}
      </datalist>
      <datalist id={CONVENIOS_DATALIST_ID}>
        {convenios.map((convenio) => (
          <option
            key={convenio.idConvenio}
            value={convenio.descricaoConvenio}
          />
        ))}
      </datalist>
      <datalist id={OPME_FORNECEDORES_DATALIST_ID}>
        {opmeFornecedores.map((fornecedor) => (
          <option key={fornecedor.idFornecedor} value={fornecedor.fornecedor} />
        ))}
      </datalist>

      <Topbar
        appTitle={appTitle}
        companyName={companyName}
        companyPhoto={companyPhoto}
        session={session}
        breadcrumbItems={breadcrumbItems}
        notificationsOpen={notificationsOpen}
        notificationCount={notificationCount}
        onToggleNotifications={onToggleNotifications}
        onLogout={onLogout}
      />

      <div className="app-layout">
        <Sidebar
          session={session}
          activeView={activeView}
          currentUserProfile={currentUserProfile}
          clinicName={companyName}
          canAccessDashboard={canAccessDashboard}
          canAccessPatients={canAccessPatients}
          canAccessUsers={canAccessUsers}
          canEditOwnUser={canEditOwnUser}
          canAccessBilling={canAccessBilling}
          canAccessMedicalGroups={canAccessMedicalGroups}
          canAccessSettings={canAccessSettings}
          canAccessAgenda={canAccessAgenda}
          canAccessClinics={canAccessClinics}
          usersCount={usersCount}
          pacientesCount={pacientesCount}
          medicalGroupsCount={medicalGroupsCount}
          pendingPaymentsCount={pendingPaymentsCount}
          unreadAgendaNotificationCount={unreadAgendaNotificationCount}
          onOpenDashboard={onOpenDashboard}
          onOpenUsersList={onOpenUsersList}
          onOpenMyProfile={onOpenMyProfile}
          onOpenPatientsList={onOpenPatientsList}
          onOpenBilling={onOpenBilling}
          onOpenAttendances={onOpenAttendances}
          onOpenFinance={onOpenFinance}
          onOpenPrices={onOpenPrices}
          onOpenMedicalGroups={onOpenMedicalGroups}
          onOpenAgenda={onOpenAgenda}
          onOpenSettings={onOpenSettings}
          onOpenClinics={onOpenClinics}
        />

        <div
          className={`app-content ${activeView === "dashboard" ? "dashboard-content" : ""}`}
        >
          {children}
        </div>

        <TutorialPanel activeView={activeView} />
      </div>

      {modals}
    </main>
  );
}
