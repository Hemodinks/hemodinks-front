import { CheckCircle2, CircleCheck, FileText, Info, Users } from 'lucide-react';
import { DashboardModuleGrid } from './DashboardModuleGrid';
import { buildDashboardModules } from './dashboardModules';
import type { DashboardPageProps } from './dashboardTypes';
import './dashboard.css';

export function DashboardContainer(props: DashboardPageProps) {
  const modules = buildDashboardModules(props);

  return (
    <section className="dashboard-workspace">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">Modulos</span>
          <h2>Cadastros {props.companyName}</h2>
        </div>
      </div>

      {props.successMessage && (
        <p className="alert success">
          <CheckCircle2 size={17} />
          {props.successMessage}
        </p>
      )}
      {props.dashboardError && <p className="alert error">{props.dashboardError}</p>}

      <DashboardModuleGrid modules={modules} />

      <section className="dashboard-info-panel" aria-label="Painel informativo">
        <div className="dashboard-info-title">
          <span className="eyebrow">Painel informativo</span>
          <h3>Resumo geral</h3>
        </div>
        <div className="info-summary-grid">
          {props.canAccessUsers && (
            <div className="info-summary-item info-summary-users">
              <span className="info-summary-icon">
                <Users size={18} />
              </span>
              <span className="info-summary-label">Usuários ativos</span>
              <strong>{props.activeUsersCount}</strong>
            </div>
          )}
          <div className="info-summary-item info-summary-patients">
            <span className="info-summary-icon">
              <CircleCheck size={18} />
            </span>
            <span className="info-summary-label">Pacientes ativos</span>
            <strong>{props.activePatientsCount}</strong>
          </div>
          <div className="info-summary-item info-summary-pending">
            <span className="info-summary-icon amber">
              <Info size={18} />
            </span>
            <span className="info-summary-label">Pendencias</span>
            <strong>{props.pendingPaymentsCount}</strong>
          </div>
          <div className="info-summary-item info-summary-files">
            <span className="info-summary-icon">
              <FileText size={18} />
            </span>
            <span className="info-summary-label">Arquivos</span>
            <strong>{props.patientFilesCount}</strong>
          </div>
        </div>
      </section>
    </section>
  );
}
