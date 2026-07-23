import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShieldPlus,
  Stethoscope,
  Tags,
  Wallet,
  Users,
} from "lucide-react";
import type { AppView } from "../appTypes";
import type { AuthSession } from "../types";
import { UserAvatar } from "../features/users/UserAvatar";

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
  onOpenAttendances: () => void;
  onOpenFinance: () => void;
  onOpenPrices: () => void;
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
  onOpenAttendances,
  onOpenFinance,
  onOpenPrices,
  onOpenMedicalGroups,
  onOpenAgenda,
  onOpenSettings,
  onOpenClinics,
}: SidebarProps) {
  const controladoriaActive = [
    "attendances",
    "billing",
    "finance",
    "prices",
  ].includes(activeView);
  const [controladoriaOpen, setControladoriaOpen] = useState(
    controladoriaActive,
  );

  useEffect(() => {
    if (controladoriaActive) {
      setControladoriaOpen(true);
    }
  }, [controladoriaActive]);

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
            <UserAvatar
              userId={session.user.id}
              name={session.user.nome}
              photo={session.user.fotoPerfil}
              authToken={session.token}
              size="sm"
              decorative
            />
            <strong>{session.user.nome}</strong>
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
          <span className="session-meta">
            {currentUserProfile} | {session.user.email}
          </span>
        </div>

        <nav className="side-nav" aria-label="Navegação principal">
          {canAccessDashboard && (
            <button
              type="button"
              className={`side-nav-dashboard ${activeView === "dashboard" ? "active" : ""}`}
              aria-current={activeView === "dashboard" ? "page" : undefined}
              title="Visão geral dos indicadores e atividades do sistema."
              onClick={onOpenDashboard}
            >
              <LayoutDashboard size={18} />
              <span>Painel</span>
            </button>
          )}
          {canAccessUsers && (
            <button
              type="button"
              className={`side-nav-users ${activeView === "users" ? "active" : ""}`}
              aria-current={activeView === "users" ? "page" : undefined}
              title="Cadastre usuários e gerencie seus acessos."
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
              className={`side-nav-profile ${activeView === "profile" ? "active" : ""}`}
              aria-current={activeView === "profile" ? "page" : undefined}
              title="Consulte e atualize os dados do seu cadastro."
              onClick={onOpenMyProfile}
            >
              <FileText size={18} />
              <span>Meu cadastro</span>
            </button>
          )}
          {canAccessPatients && (
            <button
              type="button"
              className={`side-nav-patients ${activeView === "patients" ? "active" : ""}`}
              aria-current={activeView === "patients" ? "page" : undefined}
              title="Consulte e gerencie os cadastros dos pacientes."
              onClick={onOpenPatientsList}
            >
              <ClipboardList size={18} />
              <span>Pacientes</span>
              <span className="side-nav-count">{pacientesCount}</span>
            </button>
          )}
          {canAccessBilling && (
            <div
              className={`side-nav-accordion ${controladoriaActive ? "is-active" : ""}`}
            >
              <button
                type="button"
                className="side-nav-controladoria"
                aria-expanded={controladoriaOpen}
                aria-controls="controladoria-navigation"
                onClick={() => setControladoriaOpen((current) => !current)}
              >
                <ReceiptText size={18} />
                <span>Controladoria</span>
                <ChevronDown
                  className="side-nav-accordion-chevron"
                  size={17}
                  aria-hidden="true"
                />
              </button>
              {controladoriaOpen && (
                <div
                  id="controladoria-navigation"
                  className="side-nav-accordion-content"
                >
                  <button
                    type="button"
                    className={`side-nav-billing ${activeView === "attendances" ? "active" : ""}`}
                    aria-current={
                      activeView === "attendances" ? "page" : undefined
                    }
                    title="Registre cirurgias e os procedimentos realizados."
                    onClick={onOpenAttendances}
                  >
                    <Stethoscope size={18} />
                    <span>Atendimentos</span>
                  </button>
                  <button
                    type="button"
                    className={`side-nav-billing ${activeView === "billing" ? "active" : ""}`}
                    aria-current={
                      activeView === "billing" ? "page" : undefined
                    }
                    title="Prepare, envie e acompanhe os faturamentos médicos."
                    onClick={onOpenBilling}
                  >
                    <ReceiptText size={18} />
                    <span>Faturamento</span>
                  </button>
                  {session.user.perfilId !== 2 && (
                    <button
                      type="button"
                      className={`side-nav-billing ${activeView === "finance" ? "active" : ""}`}
                      aria-current={
                        activeView === "finance" ? "page" : undefined
                      }
                      title="Acompanhe contas a receber, pagamentos e saldos."
                      onClick={onOpenFinance}
                    >
                      <Wallet size={18} />
                      <span>Financeiro</span>
                      {pendingPaymentsCount > 0 && (
                        <span className="side-nav-count">
                          {pendingPaymentsCount}
                        </span>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`side-nav-billing ${activeView === "prices" ? "active" : ""}`}
                    aria-current={
                      activeView === "prices" ? "page" : undefined
                    }
                    title="Gerencie valores CBHPM e preços negociados por convênio."
                    onClick={onOpenPrices}
                  >
                    <Tags size={18} />
                    <span>Tabela de preços</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {canAccessMedicalGroups && (
            <button
              type="button"
              className={`side-nav-medical-groups ${activeView === "medicalGroups" ? "active" : ""}`}
              aria-current={activeView === "medicalGroups" ? "page" : undefined}
              title="Organize médicos e permissões em grupos de trabalho."
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
              className={`side-nav-agenda ${activeView === "agenda" ? "active" : ""}`}
              aria-current={activeView === "agenda" ? "page" : undefined}
              title="Consulte compromissos, lembretes e notificações."
              onClick={onOpenAgenda}
            >
              <CalendarDays size={18} />
              <span>Agenda e notificações</span>
              {unreadAgendaNotificationCount > 0 && (
                <span className="side-nav-count">
                  {unreadAgendaNotificationCount}
                </span>
              )}
            </button>
          )}
          {canAccessClinics && (
            <button
              type="button"
              className={`side-nav-clinics ${activeView === "clinics" ? "active" : ""}`}
              aria-current={activeView === "clinics" ? "page" : undefined}
              title="Cadastre e administre as clínicas disponíveis."
              onClick={onOpenClinics}
            >
              <Building2 size={18} />
              <span>Clínicas</span>
            </button>
          )}
          {canAccessSettings && (
            <button
              type="button"
              className={`side-nav-settings ${activeView === "settings" ? "active" : ""}`}
              aria-current={activeView === "settings" ? "page" : undefined}
              title="Configure preferências e parâmetros gerais do sistema."
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
