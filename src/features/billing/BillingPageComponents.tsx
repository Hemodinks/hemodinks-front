import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Modal } from '../../shared/components/Modal';
import { IconButton } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import { UserAvatar } from '../users/UserAvatar';
import type { BillingBreakdownItem, BillingChecklistItem, BillingRecord } from './billingUtils';

type BillingSummaryCardProps = {
  title: string;
  value: string;
  caption: string;
  tone: 'gross' | 'net' | 'glosa' | 'records' | 'paid' | 'attention';
  icon: ReactNode;
};

export function BillingSummaryCard({ title, value, caption, tone, icon }: BillingSummaryCardProps) {
  return (
    <article className={`billing-summary-card billing-summary-${tone}`}>
      <span className="billing-summary-icon">{icon}</span>
      <span className="billing-summary-title">{title}</span>
      <strong>{value}</strong>
      <span className="billing-summary-caption">{caption}</span>
    </article>
  );
}

type BillingRankingPanelProps = {
  title: string;
  subtitle: string;
  items: BillingBreakdownItem[];
  emptyLabel: string;
};

export function BillingRankingPanel({ title, subtitle, items, emptyLabel }: BillingRankingPanelProps) {
  return (
    <article className="billing-ranking-panel">
      <div className="billing-section-heading">
        <div>
          <span className="eyebrow">{subtitle}</span>
          <h3>{title}</h3>
        </div>
      </div>

      {items.length ? (
        <ol className="billing-ranking-list">
          {items.map((item) => (
            <li key={item.label}>
              <div>
                <strong>{item.label}</strong>
                <span>{item.totalRecords} cirurgia(s) | {item.pendingCount} com pendências</span>
              </div>
              <div className="billing-ranking-values">
                <strong>{formatCurrency(item.totalGrossAmount)}</strong>
                <span>Líquido {formatCurrency(item.totalNetAmount)}</span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-row">{emptyLabel}</p>
      )}
    </article>
  );
}

type BillingMonthFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function BillingMonthField({ id, label, value, onChange }: BillingMonthFieldProps) {
  return (
    <label className="filter-field billing-month-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="month"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function BillingChecklist({ items }: { items: BillingChecklistItem[] }) {
  return (
    <dl className="billing-checklist">
      {items.map((item) => (
        <div key={item.label} className="billing-checklist-row">
          <dt>
            <span className={`billing-flag ${item.status}`}>{item.status === 'ok' ? 'Ok' : item.status === 'warning' ? 'Atenção' : 'Pendente'}</span>
            {item.label}
          </dt>
          <dd>
            <strong>{item.value}</strong>
            {item.hint && <span>{item.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function BillingProcedureList({ procedures }: { procedures: BillingRecord['procedures'] }) {
  return (
    <ul className="billing-procedure-list">
      {procedures.map((procedure, index) => (
        <li key={`${procedure.cbhpmCodigo || procedure.procedimento}-${index}`}>
          <div className="billing-procedure-content">
            <strong>{procedure.procedimento}</strong>
            <div className="billing-procedure-meta">
              <span className="billing-procedure-chip">{procedure.cbhpmCodigo || 'Sem código'}</span>
              {procedure.cbhpmPorte && (
                <span className="billing-procedure-chip">Porte {procedure.cbhpmPorte}</span>
              )}
            </div>
          </div>
          <span className="billing-procedure-value">
            {procedure.valorReferencia != null ? formatCurrency(procedure.valorReferencia) : 'Sem valor referência'}
          </span>
        </li>
      ))}
    </ul>
  );
}

type BillingSummaryModalProps = {
  record: BillingRecord;
  authToken: string;
  onClose: () => void;
};

export function BillingSummaryModal({ record, authToken, onClose }: BillingSummaryModalProps) {
  return (
    <Modal titleId="billing-summary-title" className="billing-summary-modal" onClose={onClose}>
      <div className="panel-title billing-summary-titlebar">
        <div className="billing-patient-cell billing-summary-patient">
          <UserAvatar
            userId={record.paciente.userId}
            name={record.patientName}
            photo={record.paciente.fotoPerfil}
            authToken={authToken}
            size="sm"
          />
          <div>
            <span className="eyebrow">Informações resumidas</span>
            <h2 id="billing-summary-title">{record.patientName}</h2>
            <p className="billing-summary-modal-subtitle">{record.doctorName}</p>
          </div>
        </div>
        <IconButton label="Fechar informações resumidas" title="Fechar" tone="muted" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>

      <div className="billing-summary-layout">
        <section className="billing-summary-overview" aria-label="Dados gerais do faturamento">
          <article className="billing-summary-info-card">
            <span>Data / hospital</span>
            <strong>{record.surgeryDateLabel}</strong>
            <p>{record.hospitalName}</p>
          </article>

          <article className="billing-summary-info-card billing-summary-convenio-card">
            <span>Convênio / regime</span>
            <strong>{record.convenioName}</strong>
            <p>{record.regime === 'convenio' ? 'Convênio' : 'Particular'} | {record.authorizationCode || 'Sem autorização informada'}</p>
          </article>

          <article className="billing-summary-info-card billing-summary-support-card">
            <span>Status / suporte</span>
            <strong>{record.statusLabel}</strong>
            <p>{record.filesCount} anexo(s) | {record.pendingChecklistItems} pendência(s)</p>
          </article>
        </section>

        <section className="billing-summary-metrics" aria-label="Valores do faturamento">
          <article className="billing-summary-metric-card">
            <span>Faturado</span>
            <strong>{record.paymentHasNumericValue ? formatCurrency(record.paymentAmount) : record.paymentRaw || '-'}</strong>
          </article>
          <article className="billing-summary-metric-card">
            <span>Glosa</span>
            <strong>{record.glosaHasNumericValue ? formatCurrency(record.glosaAmount) : record.glosaRaw || '-'}</strong>
          </article>
          <article className="billing-summary-metric-card">
            <span>Líquido</span>
            <strong>{record.paymentHasNumericValue || record.glosaHasNumericValue ? formatCurrency(record.netAmount) : '-'}</strong>
          </article>
        </section>

        <section className="billing-detail-section billing-summary-main">
          <div className="billing-section-heading">
            <div>
              <span className="eyebrow">Procedimentos</span>
              <h4>Resumo dos códigos vinculados</h4>
            </div>
          </div>

          {record.procedures.length ? (
            <BillingProcedureList procedures={record.procedures} />
          ) : (
            <p className="empty-row">Nenhum procedimento vinculado a esta cirurgia.</p>
          )}
        </section>
      </div>
    </Modal>
  );
}
