import type { ReactNode } from 'react';
import type { AppView, BreadcrumbItem, Theme } from '../appTypes';
import type { AuthSession, Convenio, OpmeFornecedor, User } from '../types';
import { LoadingOverlay } from '../shared/components/LoadingOverlay';
import {
  CONVENIOS_DATALIST_ID,
  MEDICAL_USERS_DATALIST_ID,
  OPME_FORNECEDORES_DATALIST_ID,
} from '../shared/utils/formatters';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

type AppShellProps = {
  children: ReactNode;
  modals?: ReactNode;
  session: AuthSession;
  isBusy: boolean;
  appTitle: string;
  activeView: AppView;
  breadcrumbItems: BreadcrumbItem[];
  theme: Theme;
  notificationsOpen: boolean;
  notificationCount: number;
  currentUserProfile: string;
  canAccessDashboard: boolean;
  canAccessUsers: boolean;
  canEditOwnUser: boolean;
  canAccessAgenda: boolean;
  usersCount: number;
  pacientesCount: number;
  medicalUsers: User[];
  convenios: Convenio[];
  opmeFornecedores: OpmeFornecedor[];
  onToggleNotifications: () => void;
  onToggleTheme: () => void;
  onOpenPasswordModal: () => void;
  onLogout: () => void;
  onOpenDashboard: () => void;
  onOpenUsersList: () => void;
  onOpenMyProfile: () => void;
  onOpenPatientsList: () => void;
  onOpenAgenda: () => void;
};

export function AppShell({
  children,
  modals,
  session,
  isBusy,
  appTitle,
  activeView,
  breadcrumbItems,
  theme,
  notificationsOpen,
  notificationCount,
  currentUserProfile,
  canAccessDashboard,
  canAccessUsers,
  canEditOwnUser,
  canAccessAgenda,
  usersCount,
  pacientesCount,
  medicalUsers,
  convenios,
  opmeFornecedores,
  onToggleNotifications,
  onToggleTheme,
  onOpenPasswordModal,
  onLogout,
  onOpenDashboard,
  onOpenUsersList,
  onOpenMyProfile,
  onOpenPatientsList,
  onOpenAgenda,
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
          <option key={convenio.idConvenio} value={convenio.descricaoConvenio} />
        ))}
      </datalist>
      <datalist id={OPME_FORNECEDORES_DATALIST_ID}>
        {opmeFornecedores.map((fornecedor) => (
          <option key={fornecedor.idFornecedor} value={fornecedor.fornecedor} />
        ))}
      </datalist>

      <Topbar
        appTitle={appTitle}
        session={session}
        breadcrumbItems={breadcrumbItems}
        theme={theme}
        notificationsOpen={notificationsOpen}
        notificationCount={notificationCount}
        onToggleNotifications={onToggleNotifications}
        onToggleTheme={onToggleTheme}
        onOpenPasswordModal={onOpenPasswordModal}
        onLogout={onLogout}
      />

      <div className="app-layout">
        <Sidebar
          session={session}
          activeView={activeView}
          currentUserProfile={currentUserProfile}
          canAccessDashboard={canAccessDashboard}
          canAccessUsers={canAccessUsers}
          canEditOwnUser={canEditOwnUser}
          canAccessAgenda={canAccessAgenda}
          usersCount={usersCount}
          pacientesCount={pacientesCount}
          onOpenDashboard={onOpenDashboard}
          onOpenUsersList={onOpenUsersList}
          onOpenMyProfile={onOpenMyProfile}
          onOpenPatientsList={onOpenPatientsList}
          onOpenAgenda={onOpenAgenda}
        />

        <div className={`app-content ${activeView === 'dashboard' ? 'dashboard-content' : ''}`}>
          {children}
        </div>
      </div>

      {modals}
    </main>
  );
}
