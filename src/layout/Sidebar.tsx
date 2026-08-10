import { useEffect, useId, useState } from 'react';
import { BarChart3, Building2, CalendarDays, ChevronDown, ClipboardList, FileText, LayoutDashboard, ReceiptText, Settings, ShieldPlus, Users } from 'lucide-react';
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
  onOpenReports: () => void;
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
  onOpenReports,
  onOpenMedicalGroups,
  onOpenAgenda,
  onOpenSettings,
  onOpenClinics,
}: SidebarProps) {
  const billingSubmenuId = useId();
  const isBillingModuleActive = activeView === 'billing' || activeView === 'reports';
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
          <span className="session-meta">{currentUserProfile} | {session.user.email}</span>
        </div>

        <nav className="side-nav" aria-label="Navegação principal">
          {canAccessDashboard && (
            <button
              type="button"
              className={`side-nav-dashboard ${activeView === 'dashboard' ? 'active' : ''}`}
              aria-current={activeView === 'dashboard' ? 'page' : undefined}
              onClick={onOpenDashboard}
            >
              <LayoutDashboard size={18} />
              <span>Painel</span>
            </button>
          )}
          {canAccessUsers && (
            <button
              type="button"
              className={`side-nav-users ${activeView === 'users' ? 'active' : ''}`}
              aria-current={activeView === 'users' ? 'page' : undefined}
              onClick={onOpenUsersList}
            >
              <Users size={18} />
              <span>Usuários</span>
              <span className="side-nav-count">{usersCount}</span>
            </button>
          )}
          {canEditOwnUser && (
            <button
              type="button"
              className={`side-nav-profile ${activeView === 'profile' ? 'active' : ''}`}
              aria-current={activeView === 'profile' ? 'page' : undefined}
              onClick={onOpenMyProfile}
            >
              <FileText size={18} />
              <span>Meu cadastro</span>
            </button>
          )}
          {canAccessPatients && (
            <button
              type="button"
              className={`side-nav-patients ${activeView === 'patients' ? 'active' : ''}`}
              aria-current={activeView === 'patients' ? 'page' : undefined}
              onClick={onOpenPatientsList}
            >
              <ClipboardList size={18} />
              <span>Pacientes - Cirurgias</span>
              <span className="side-nav-count">{pacientesCount}</span>
            </button>
          )}
          {canAccessBillingModule && (
            <div className="side-nav-billing-group">
              <button
                type="button"
                className={`side-nav-billing side-nav-billing-toggle ${isBillingModuleActive ? 'active' : ''}`}
                aria-expanded={isBillingMenuOpen}
                aria-controls={billingSubmenuId}
                onClick={() => setIsBillingMenuOpen((current) => !current)}
              >
                <ReceiptText size={18} />
                <span>Faturamento</span>
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
                    aria-current={activeView === 'billing' ? 'page' : undefined}
                    onClick={onOpenBilling}
                  >
                    <ReceiptText size={16} />
                    <span>Gestão de faturamento</span>
                  </button>
                )}
                {canAccessBilling && (
                  <button
                    type="button"
                    className={`side-nav-reports side-nav-billing-subitem ${activeView === 'reports' ? 'active' : ''}`}
                    aria-current={activeView === 'reports' ? 'page' : undefined}
                    onClick={onOpenReports}
                  >
                    <BarChart3 size={16} />
                    <span>Relatórios</span>
                  </button>
                )}
              </div>
            </div>
          )}
          {canAccessMedicalGroups && (
            <button
              type="button"
              className={`side-nav-medical-groups ${activeView === 'medicalGroups' ? 'active' : ''}`}
              aria-current={activeView === 'medicalGroups' ? 'page' : undefined}
              onClick={onOpenMedicalGroups}
            >
              <ShieldPlus size={18} />
              <span>Grupos médicos</span>
              <span className="side-nav-count">{medicalGroupsCount}</span>
            </button>
          )}
          {canAccessAgenda && (
            <button
              type="button"
              className={`side-nav-agenda ${activeView === 'agenda' ? 'active' : ''}`}
              aria-current={activeView === 'agenda' ? 'page' : undefined}
              onClick={onOpenAgenda}
            >
              <CalendarDays size={18} />
              <span>Agenda e notificações</span>
              {unreadAgendaNotificationCount > 0 && (
                <span className="side-nav-count">{unreadAgendaNotificationCount}</span>
              )}
            </button>
          )}
          {canAccessClinics && (
            <button
              type="button"
              className={`side-nav-clinics ${activeView === 'clinics' ? 'active' : ''}`}
              aria-current={activeView === 'clinics' ? 'page' : undefined}
              onClick={onOpenClinics}
            >
              <Building2 size={18} />
              <span>Clínicas</span>
            </button>
          )}
          {canAccessSettings && (
            <button
              type="button"
              className={`side-nav-settings ${activeView === 'settings' ? 'active' : ''}`}
              aria-current={activeView === 'settings' ? 'page' : undefined}
              onClick={onOpenSettings}
            >
              <Settings size={18} />
              <span>Configuração</span>
            </button>
          )}
        </nav>
      </div>
    </aside>
  );
}
