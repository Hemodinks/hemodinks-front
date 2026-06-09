import {
  ArrowRight,
  CheckCircle2,
  CircleCheck,
  ClipboardList,
  FileText,
  GripVertical,
  Info,
  Users,
} from 'lucide-react';

type DashboardPageProps = {
  canAccessUsers: boolean;
  canEditOwnUser: boolean;
  patientReadOnly: boolean;
  usersCount: number;
  pacientesCount: number;
  activeUsersCount: number;
  activePatientsCount: number;
  pendingPaymentsCount: number;
  patientFilesCount: number;
  successMessage: string;
  dashboardError: string;
  onOpenUsersList: () => void;
  onOpenMyProfile: () => void;
  onOpenPatientsList: () => void;
};

export function DashboardPage({
  canAccessUsers,
  canEditOwnUser,
  patientReadOnly,
  usersCount,
  pacientesCount,
  activeUsersCount,
  activePatientsCount,
  pendingPaymentsCount,
  patientFilesCount,
  successMessage,
  dashboardError,
  onOpenUsersList,
  onOpenMyProfile,
  onOpenPatientsList,
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
