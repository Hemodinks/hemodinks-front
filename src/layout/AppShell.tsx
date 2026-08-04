import type { ReactNode } from 'react';
import type { AppView, BreadcrumbItem } from '../appTypes';
import type { AuthSession } from '../shared/domain/sessionTypes';
import type { Convenio, OpmeFornecedor } from '../shared/domain/patientContracts';
import type { MedicalUserOption } from '../shared/domain/userContracts';
import { LoadingOverlay } from '../shared/components/LoadingOverlay';
import {
  CONVENIOS_DATALIST_ID,
  formatPersonName,
  MEDICAL_USERS_DATALIST_ID,
  OPME_FORNECEDORES_DATALIST_ID,
} from '../shared/utils/formatters';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { TutorialPanel } from './TutorialPanel';

export type AppShellNavigation = {
  activeView: AppView;
  openDashboard: () => void;
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

export type AppShellCounters = {
  users: number;
  patients: number;
  medicalGroups: number;
  attendances: number;
  billings: number;
  pendingPayments: number;
  unreadAgendaNotifications: number;
  notifications: number;
};

export type AppShellAccess = {
  dashboard: boolean;
  patients: boolean;
  users: boolean;
  ownUser: boolean;
  billing: boolean;
  prices: boolean;
  medicalGroups: boolean;
  settings: boolean;
  agenda: boolean;
  clinics: boolean;
};

export type AppShellActions = {
  toggleNotifications: () => void;
  logout: () => void;
};

export type AppShellLookups = {
  medicalUsers: MedicalUserOption[];
  convenios: Convenio[];
  opmeFornecedores: OpmeFornecedor[];
};

type AppShellProps = {
  children: ReactNode;
  modals?: ReactNode;
  session: AuthSession;
  isBusy: boolean;
  appTitle: string;
  companyName: string;
  companyPhoto?: string | null;
  breadcrumbItems: BreadcrumbItem[];
  notificationsOpen: boolean;
  currentUserProfile: string;
  navigation: AppShellNavigation;
  counters: AppShellCounters;
  access: AppShellAccess;
  actions: AppShellActions;
  lookups: AppShellLookups;
};

export function AppShell({
  children,
  modals,
  session,
  isBusy,
  appTitle,
  companyName,
  companyPhoto,
  breadcrumbItems,
  notificationsOpen,
  currentUserProfile,
  navigation,
  counters,
  access,
  actions,
  lookups,
}: AppShellProps) {
  return (
    <main className="app-shell">
      <LoadingOverlay active={isBusy} />
      <datalist id={MEDICAL_USERS_DATALIST_ID}>
        {lookups.medicalUsers.map((user) => (
          <option key={user.id} value={formatPersonName(user.nome)} />
        ))}
      </datalist>
      <datalist id={CONVENIOS_DATALIST_ID}>
        {lookups.convenios.map((convenio) => (
          <option key={convenio.idConvenio} value={convenio.descricaoConvenio} />
        ))}
      </datalist>
      <datalist id={OPME_FORNECEDORES_DATALIST_ID}>
        {lookups.opmeFornecedores.map((fornecedor) => (
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
        notificationCount={counters.notifications}
        onToggleNotifications={actions.toggleNotifications}
        onLogout={actions.logout}
      />

      <div className="app-layout">
        <Sidebar
          session={session}
          activeView={navigation.activeView}
          currentUserProfile={currentUserProfile}
          clinicName={companyName}
          canAccessDashboard={access.dashboard}
          canAccessPatients={access.patients}
          canAccessUsers={access.users}
          canEditOwnUser={access.ownUser}
          canAccessBilling={access.billing}
          showPrices={access.prices}
          canAccessMedicalGroups={access.medicalGroups}
          canAccessSettings={access.settings}
          canAccessAgenda={access.agenda}
          canAccessClinics={access.clinics}
          usersCount={counters.users}
          pacientesCount={counters.patients}
          medicalGroupsCount={counters.medicalGroups}
          attendancesCount={counters.attendances}
          billingsCount={counters.billings}
          pendingPaymentsCount={counters.pendingPayments}
          unreadAgendaNotificationCount={counters.unreadAgendaNotifications}
          onOpenDashboard={navigation.openDashboard}
          onOpenUsersList={navigation.openUsersList}
          onOpenMyProfile={navigation.openMyProfile}
          onOpenPatientsList={navigation.openPatientsList}
          onOpenBilling={navigation.openBilling}
          onOpenAttendances={navigation.openAttendances}
          onOpenFinance={navigation.openFinance}
          onOpenPrices={navigation.openPrices}
          onOpenMedicalGroups={navigation.openMedicalGroups}
          onOpenAgenda={navigation.openAgenda}
          onOpenSettings={navigation.openSettings}
          onOpenClinics={navigation.openClinics}
        />

        <div
          className={`app-content ${navigation.activeView === 'dashboard' ? 'dashboard-content' : ''}`}
        >
          {children}
        </div>

        <TutorialPanel activeView={navigation.activeView} />
      </div>

      {modals}
    </main>
  );
}
