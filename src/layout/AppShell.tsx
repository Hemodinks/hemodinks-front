import type { ReactNode } from 'react';
import type { AppView, BreadcrumbItem, Theme } from '../appTypes';
import type { AuthSession, Convenio, User } from '../types';
import { LoadingOverlay } from '../shared/components/LoadingOverlay';
import {
  CONVENIOS_DATALIST_ID,
  MEDICAL_USERS_DATALIST_ID,
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
  canAccessUsers: boolean;
  canEditOwnUser: boolean;
  usersCount: number;
  pacientesCount: number;
  medicalUsers: User[];
  convenios: Convenio[];
  onToggleNotifications: () => void;
  onToggleTheme: () => void;
  onOpenPasswordModal: () => void;
  onLogout: () => void;
  onOpenDashboard: () => void;
  onOpenUsersList: () => void;
  onOpenMyProfile: () => void;
  onOpenPatientsList: () => void;
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
  canAccessUsers,
  canEditOwnUser,
  usersCount,
  pacientesCount,
  medicalUsers,
  convenios,
  onToggleNotifications,
  onToggleTheme,
  onOpenPasswordModal,
  onLogout,
  onOpenDashboard,
  onOpenUsersList,
  onOpenMyProfile,
  onOpenPatientsList,
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
          canAccessUsers={canAccessUsers}
          canEditOwnUser={canEditOwnUser}
          usersCount={usersCount}
          pacientesCount={pacientesCount}
          onOpenDashboard={onOpenDashboard}
          onOpenUsersList={onOpenUsersList}
          onOpenMyProfile={onOpenMyProfile}
          onOpenPatientsList={onOpenPatientsList}
        />

        <div className={`app-content ${activeView === 'dashboard' ? 'dashboard-content' : ''}`}>
          {children}
        </div>
      </div>

      {modals}
    </main>
  );
}
