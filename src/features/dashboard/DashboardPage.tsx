import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleCheck,
  ClipboardList,
  FileText,
  GripVertical,
  Info,
  ShieldPlus,
  Users,
} from 'lucide-react';

type DashboardPageProps = {
  canAccessUsers: boolean;
  canEditOwnUser: boolean;
  canAccessBilling: boolean;
  canAccessMedicalGroups: boolean;
  patientReadOnly: boolean;
  usersCount: number;
  pacientesCount: number;
  activeUsersCount: number;
  activePatientsCount: number;
  pendingPaymentsCount: number;
  patientFilesCount: number;
  upcomingEventsCount: number;
  unreadAgendaNotificationCount: number;
  successMessage: string;
  dashboardError: string;
  onOpenUsersList: () => void;
  onOpenMyProfile: () => void;
  onOpenPatientsList: () => void;
  onOpenBilling: () => void;
  onOpenMedicalGroups: () => void;
  onOpenAgenda: () => void;
};

export function DashboardPage({
  canAccessUsers,
  canEditOwnUser,
  canAccessBilling,
  canAccessMedicalGroups,
  patientReadOnly,
  usersCount,
  pacientesCount,
  activeUsersCount,
  activePatientsCount,
  pendingPaymentsCount,
  patientFilesCount,
  upcomingEventsCount,
  unreadAgendaNotificationCount,
  successMessage,
  dashboardError,
  onOpenUsersList,
  onOpenMyProfile,
  onOpenPatientsList,
  onOpenBilling,
  onOpenMedicalGroups,
  onOpenAgenda,
}: DashboardPageProps) {
  return (
    <section className="dashboard-workspace">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">Modulos</span>
          <h2>Cadastros Hemodinks</h2>
        </div>
      </div>

      {successMessage && <p className="alert success"><CheckCircle2 size={17} />{successMessage}</p>}
      {dashboardError && <p className="alert error">{dashboardError}</p>}

      <div className="module-grid">
        {canAccessUsers && (
          <button type="button" className="module-card module-card-users" onClick={onOpenUsersList} aria-label="Abrir usuarios">
            <span className="module-card-menu" aria-hidden="true"><GripVertical size={20} /></span>
            <span className="module-icon"><Users size={24} /></span>
            <span className="module-title">Usuarios</span>
            <span className="module-metric">Gerenciar usuarios</span>
            <span className="module-card-foot">
              <span>{usersCount} cadastrados</span>
              <ArrowRight size={20} />
            </span>
          </button>
        )}

        {canEditOwnUser && (
          <button type="button" className="module-card module-card-profile" onClick={onOpenMyProfile} aria-label="Abrir meu cadastro">
            <span className="module-card-menu" aria-hidden="true"><GripVertical size={20} /></span>
            <span className="module-icon"><FileText size={24} /></span>
            <span className="module-title">Meu cadastro</span>
            <span className="module-metric">Dados e documentos</span>
            <span className="module-card-foot">
              <span>Editar registro</span>
              <ArrowRight size={20} />
            </span>
          </button>
        )}

        <button type="button" className="module-card module-card-patients" onClick={onOpenPatientsList} aria-label="Abrir pacientes">
          <span className="module-card-menu" aria-hidden="true"><GripVertical size={20} /></span>
          <span className="module-icon"><ClipboardList size={24} /></span>
          <span className="module-title">Pacientes</span>
          <span className="module-metric">{patientReadOnly ? 'Visualizar cadastro' : 'Administrar atendimentos'}</span>
          <span className="module-card-foot">
            <span>{pacientesCount} cadastrados</span>
            <ArrowRight size={20} />
          </span>
        </button>

        {canAccessBilling && (
          <button type="button" className="module-card module-card-billing" onClick={onOpenBilling} aria-label="Abrir faturamento medico">
            <span className="module-card-menu" aria-hidden="true"><GripVertical size={20} /></span>
            <span className="module-icon"><FileText size={24} /></span>
            <span className="module-title">Faturamento medico</span>
            <span className="module-metric">Honorarios, glosas e repasses</span>
            <span className="module-card-foot">
              <span>{pendingPaymentsCount} pendencias financeiras</span>
              <ArrowRight size={20} />
            </span>
          </button>
        )}

        {canAccessMedicalGroups && (
          <button type="button" className="module-card module-card-medical-groups" onClick={onOpenMedicalGroups} aria-label="Abrir grupos medicos">
            <span className="module-card-menu" aria-hidden="true"><GripVertical size={20} /></span>
            <span className="module-icon"><ShieldPlus size={24} /></span>
            <span className="module-title">Grupos medicos</span>
            <span className="module-metric">Relacionar equipes e escopos</span>
            <span className="module-card-foot">
              <span>Definir compartilhamento</span>
              <ArrowRight size={20} />
            </span>
          </button>
        )}

        <button type="button" className="module-card module-card-agenda" onClick={onOpenAgenda} aria-label="Abrir agenda e notificacoes">
          <span className="module-card-menu" aria-hidden="true"><GripVertical size={20} /></span>
          <span className="module-icon"><CalendarDays size={24} /></span>
          <span className="module-title">Agenda e notificacoes</span>
          <span className="module-metric">Eventos, lembretes e avisos</span>
          <span className="module-card-foot">
            <span>{upcomingEventsCount} proximos</span>
            {unreadAgendaNotificationCount > 0 && (
              <span className="module-badge">{unreadAgendaNotificationCount} nao lidas</span>
            )}
            <ArrowRight size={20} />
          </span>
        </button>
      </div>

      <section className="dashboard-info-panel" aria-label="Painel informativo">
        <div className="dashboard-info-title">
          <span className="eyebrow">Painel informativo</span>
          <h3>Resumo geral</h3>
        </div>

        <div className="info-summary-grid">
          {canAccessUsers && (
            <div className="info-summary-item info-summary-users">
              <span className="info-summary-icon"><Users size={18} /></span>
              <span className="info-summary-label">Usuarios ativos</span>
              <strong>{activeUsersCount}</strong>
            </div>
          )}
          <div className="info-summary-item info-summary-patients">
            <span className="info-summary-icon"><CircleCheck size={18} /></span>
            <span className="info-summary-label">Pacientes ativos</span>
            <strong>{activePatientsCount}</strong>
          </div>
          <div className="info-summary-item info-summary-pending">
            <span className="info-summary-icon amber"><Info size={18} /></span>
            <span className="info-summary-label">Pendencias</span>
            <strong>{pendingPaymentsCount}</strong>
          </div>
          <div className="info-summary-item info-summary-files">
            <span className="info-summary-icon"><FileText size={18} /></span>
            <span className="info-summary-label">Arquivos</span>
            <strong>{patientFilesCount}</strong>
          </div>
        </div>
      </section>
    </section>
  );
}
