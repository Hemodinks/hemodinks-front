import { useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CSSProperties } from 'react';
import { APP_MODULES } from '../shared/navigation/appModules';
import type { AppView } from '../appTypes';
import type { AuthSession } from '../types';
import { UserAvatar } from '../features/users/UserAvatar';
import { formatPersonName } from '../shared/utils/formatters';

type SidebarProps = {
  session: AuthSession;
  activeView: AppView;
  currentUserProfile: string;
  clinicName: string;
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
  onOpenDashboard: () => void;
  onOpenUsersList: () => void;
  onOpenMyProfile: () => void;
  onOpenPatientsList: () => void;
  onOpenBilling: () => void;
  onOpenBillingHistory: () => void;
  onOpenReports: () => void;
  onOpenTutorials: () => void;
  onOpenMedicalGroups: () => void;
  onOpenAgenda: () => void;
  onOpenSettings: () => void;
  onOpenClinics: () => void;
};

export function Sidebar({
  session,
  activeView,
  currentUserProfile,
  clinicName,
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
  onOpenDashboard,
  onOpenUsersList,
  onOpenMyProfile,
  onOpenPatientsList,
  onOpenBilling,
  onOpenBillingHistory,
  onOpenReports,
  onOpenTutorials,
  onOpenMedicalGroups,
  onOpenAgenda,
  onOpenSettings,
  onOpenClinics,
}: SidebarProps) {
  const billingSubmenuId = useId();
  const isBillingModuleActive = activeView === 'billing' || activeView === 'billingHistory' || activeView === 'reports';
  const canAccessBillingModule = canAccessBilling;
  const [isBillingMenuOpen, setIsBillingMenuOpen] = useState(isBillingModuleActive);

  useEffect(() => {
    if (isBillingModuleActive) {
      setIsBillingMenuOpen(true);
    }
  }, [activeView, isBillingModuleActive]);

  return (
    <aside className="sidebar-panel" aria-label="Sessão ativa">
      <div className="sidebar-card">
        <div className="sidebar-heading">
          <span className="eyebrow">Painel</span>
          <h2>Sessão ativa</h2>
        </div>

        <div className="session-card">
          <span className="session-label">Usuário</span>
          <div className="session-user-row">
            <UserAvatar userId={session.user.id} name={session.user.nome} photo={session.user.fotoPerfil} authToken={session.token} size="sm" decorative />
            <strong>{formatPersonName(session.user.nome)}</strong>
          </div>
        </div>

        <div className="session-card">
          <span className="session-label">Clínica atual</span>
          <strong>{clinicName}</strong>
          <span className="session-meta">{session.user.clinicaSlug}</span>
        </div>

        <div className="session-card">
          <span className="session-label">Perfil</span>
          <strong>{currentUserProfile}</strong>
          <span className="session-meta">{session.user.email}</span>
        </div>

        <nav className="side-nav" aria-label="Navegação principal">
          {canAccessDashboard && (
            <button
              type="button"
              className={`side-nav-dashboard ${activeView === 'dashboard' ? 'active' : ''}`}
              style={{ '--side-nav-color': APP_MODULES.dashboard.color } as CSSProperties}
              aria-current={activeView === 'dashboard' ? 'page' : undefined}
              onClick={onOpenDashboard}
            >
              <APP_MODULES.dashboard.icon size={18} />
              <span>{APP_MODULES.dashboard.navLabel}</span>
            </button>
          )}
          <button
            type="button"
            className={`side-nav-tutorials ${activeView === 'tutorials' ? 'active' : ''}`}
              style={{ '--side-nav-color': APP_MODULES.tutorials.color } as CSSProperties}
            aria-current={activeView === 'tutorials' ? 'page' : undefined}
            onClick={onOpenTutorials}
          >
            <APP_MODULES.tutorials.icon size={18} />
            <span>{APP_MODULES.tutorials.navLabel}</span>
          </button>
          {canAccessUsers && (
            <button
              type="button"
              className={`side-nav-users ${activeView === 'users' ? 'active' : ''}`}
              style={{ '--side-nav-color': APP_MODULES.users.color } as CSSProperties}
              aria-current={activeView === 'users' ? 'page' : undefined}
              onClick={onOpenUsersList}
            >
              <APP_MODULES.users.icon size={18} />
              <span>{APP_MODULES.users.navLabel}</span>
              <span className="side-nav-count">{usersCount}</span>
            </button>
          )}
          {canEditOwnUser && (
            <button
              type="button"
              className={`side-nav-profile ${activeView === 'profile' ? 'active' : ''}`}
              style={{ '--side-nav-color': APP_MODULES.profile.color } as CSSProperties}
              aria-current={activeView === 'profile' ? 'page' : undefined}
              onClick={onOpenMyProfile}
            >
              <APP_MODULES.profile.icon size={18} />
              <span>{APP_MODULES.profile.navLabel}</span>
            </button>
          )}
          {canAccessPatients && (
            <button
              type="button"
              className={`side-nav-patients ${activeView === 'patients' ? 'active' : ''}`}
              style={{ '--side-nav-color': APP_MODULES.patients.color } as CSSProperties}
              aria-current={activeView === 'patients' ? 'page' : undefined}
              onClick={onOpenPatientsList}
            >
              <APP_MODULES.patients.icon size={18} />
              <span>{APP_MODULES.patients.navLabel}</span>
              <span className="side-nav-count">{pacientesCount}</span>
            </button>
          )}
          {canAccessBillingModule && (
            <div className="side-nav-billing-group">
              <button
                type="button"
                className={`side-nav-billing side-nav-billing-toggle ${isBillingModuleActive ? 'active' : ''}`}
              style={{ '--side-nav-color': APP_MODULES.billing.color } as CSSProperties}
                aria-expanded={isBillingMenuOpen}
                aria-controls={billingSubmenuId}
                onClick={() => setIsBillingMenuOpen((current) => !current)}
              >
                <APP_MODULES.billing.icon size={18} />
                <span>{APP_MODULES.billing.navLabel}</span>
                {pendingPaymentsCount > 0 && (
                  <span className="side-nav-count">{pendingPaymentsCount}</span>
                )}
                <ChevronDown className={`side-nav-chevron ${isBillingMenuOpen ? 'is-open' : ''}`} size={17} aria-hidden="true" />
              </button>
              <div
                id={billingSubmenuId}
                className="side-nav-billing-submenu"
                aria-label="Opções de faturamento"
                hidden={!isBillingMenuOpen}
              >
                {canAccessBilling && (
                  <button
                    type="button"
                    className={`side-nav-billing side-nav-billing-subitem ${activeView === 'billing' ? 'active' : ''}`}
              style={{ '--side-nav-color': APP_MODULES.billing.color } as CSSProperties}
                    aria-current={activeView === 'billing' ? 'page' : undefined}
                    onClick={onOpenBilling}
                  >
                    <APP_MODULES.billing.icon size={16} />
                    <span>Gestão de faturamento</span>
                  </button>
                )}
                {canAccessBilling && (
                  <button
                    type="button"
                    className={`side-nav-reports side-nav-billing-subitem ${activeView === 'reports' ? 'active' : ''}`}
              style={{ '--side-nav-color': APP_MODULES.reports.color } as CSSProperties}
                    aria-current={activeView === 'reports' ? 'page' : undefined}
                    onClick={onOpenReports}
                  >
                    <APP_MODULES.reports.icon size={16} />
                    <span>{APP_MODULES.reports.navLabel}</span>
                  </button>
                )}
                {canAccessBilling && (
                  <button
                    type="button"
                    className={`side-nav-billing-history side-nav-billing-subitem ${activeView === 'billingHistory' ? 'active' : ''}`}
              style={{ '--side-nav-color': APP_MODULES.billingHistory.color } as CSSProperties}
                    aria-current={activeView === 'billingHistory' ? 'page' : undefined}
                    onClick={onOpenBillingHistory}
                  >
                    <APP_MODULES.billingHistory.icon size={16} />
                    <span>{APP_MODULES.billingHistory.navLabel}</span>
                  </button>
                )}
              </div>
            </div>
          )}
          {canAccessMedicalGroups && (
            <button
              type="button"
              className={`side-nav-medical-groups ${activeView === 'medicalGroups' ? 'active' : ''}`}
              style={{ '--side-nav-color': APP_MODULES.medicalGroups.color } as CSSProperties}
              aria-current={activeView === 'medicalGroups' ? 'page' : undefined}
              onClick={onOpenMedicalGroups}
            >
              <APP_MODULES.medicalGroups.icon size={18} />
              <span>{APP_MODULES.medicalGroups.navLabel}</span>
              <span className="side-nav-count">{medicalGroupsCount}</span>
            </button>
          )}
          {canAccessAgenda && (
            <button
              type="button"
              className={`side-nav-agenda ${activeView === 'agenda' ? 'active' : ''}`}
              style={{ '--side-nav-color': APP_MODULES.agenda.color } as CSSProperties}
              aria-current={activeView === 'agenda' ? 'page' : undefined}
              onClick={onOpenAgenda}
            >
              <APP_MODULES.agenda.icon size={18} />
              <span>{APP_MODULES.agenda.navLabel}</span>
              {unreadAgendaNotificationCount > 0 && (
                <span className="side-nav-count">{unreadAgendaNotificationCount}</span>
              )}
            </button>
          )}
          {canAccessClinics && (
            <button
              type="button"
              className={`side-nav-clinics ${activeView === 'clinics' ? 'active' : ''}`}
              style={{ '--side-nav-color': APP_MODULES.clinics.color } as CSSProperties}
              aria-current={activeView === 'clinics' ? 'page' : undefined}
              onClick={onOpenClinics}
            >
              <APP_MODULES.clinics.icon size={18} />
              <span>{APP_MODULES.clinics.navLabel}</span>
            </button>
          )}
          {canAccessSettings && (
            <button
              type="button"
              className={`side-nav-settings ${activeView === 'settings' ? 'active' : ''}`}
              style={{ '--side-nav-color': APP_MODULES.settings.color } as CSSProperties}
              aria-current={activeView === 'settings' ? 'page' : undefined}
              onClick={onOpenSettings}
            >
              <APP_MODULES.settings.icon size={18} />
              <span>{APP_MODULES.settings.navLabel}</span>
            </button>
          )}
        </nav>
      </div>
    </aside>
  );
}
