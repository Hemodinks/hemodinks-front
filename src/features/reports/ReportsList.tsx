import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button, DataPanel, IconButton } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import { BillingChecklist, BillingProcedureList } from '../billing/BillingPageComponents';
import type { ReportRecord } from './reportTypes';

type Props = {
  records: ReportRecord[];
  isPending: boolean;
  currentPage: number;
  totalPages: number;
  visibleStart: number;
  visibleEnd: number;
  totalRecords: number;
  individualExportLoadingId: number | null;
  onPageChange: (page: number) => void;
  onExportIndividualPdf: (record: ReportRecord) => void;
};

function tags(values: string[], fallback: string) {
  return values.length ? values.join(', ') : fallback;
}

export function ReportsList(props: Props) {
  return (
    <DataPanel className="reports-results-panel">
      <div className="billing-section-heading">
        <div><span className="eyebrow">Resultados detalhados</span><h3>Atendimentos e faturamento</h3></div>
        <span className="billing-inline-note">Somente dados necessários à análise financeira e operacional.</span>
      </div>

      {props.isPending ? (
        <p className="empty-row" role="status">Carregando relatórios...</p>
      ) : props.records.length ? (
        <div className="reports-list">
          {props.records.map((record) => (
            <article className="report-record-card" key={record.id}>
              <header className="report-record-header">
                <div>
                  <span className="eyebrow">{record.surgeryDateLabel} · {record.hospitalName}</span>
                  <h3>{record.patientName}</h3>
                  <p>{record.doctorName} · {record.convenioName}</p>
                </div>
                <div className="report-record-actions">
                  <Button
                    className="reports-individual-pdf"
                    type="button"
                    disabled={props.individualExportLoadingId != null}
                    onClick={() => props.onExportIndividualPdf(record)}
                  >
                    <FileText size={16} />
                    {props.individualExportLoadingId === record.id ? 'Gerando...' : 'PDF'}
                  </Button>
                  <span className={`status-pill ${record.status === 'paid' ? 'ok' : record.status === 'pending' ? 'warning' : 'inactive'}`}>{record.statusLabel}</span>
                </div>
              </header>

              <dl className="report-record-grid">
                <div><dt>Equipe</dt><dd>{tags(record.teamNames, 'Não vinculada')}</dd></div>
                <div><dt>Grupo médico</dt><dd>{tags(record.medicalGroupNames, 'Não vinculado')}</dd></div>
                <div><dt>Auxiliares</dt><dd>{tags(record.assistantNames, 'Não informados')}</dd></div>
                <div><dt>Fornecedor OPME</dt><dd>{record.opmeSupplier}</dd></div>
                <div><dt>Autorização</dt><dd>{record.authorizationCode || 'Não informada'}</dd></div>
                <div><dt>Data do pagamento</dt><dd>{record.paymentDateLabel}</dd></div>
                <div><dt>Anexos / pendências</dt><dd>{record.filesCount} / {record.pendingChecklistItems}</dd></div>
              </dl>

              <section className="report-financial-grid" aria-label={`Valores de ${record.patientName}`}>
                <div><span>Faturado</span><strong>{record.paymentHasNumericValue ? formatCurrency(record.paymentAmount) : record.paymentRaw || '-'}</strong></div>
                <div><span>Glosa</span><strong>{record.glosaHasNumericValue ? formatCurrency(record.glosaAmount) : record.glosaRaw || '-'}</strong></div>
                <div><span>Líquido</span><strong>{formatCurrency(record.netAmount)}</strong></div>
              </section>

              <details className="report-record-details">
                <summary>Ver procedimentos e checklist de faturamento</summary>
                <div className="report-record-details-content">
                  <section>
                    <h4>Procedimentos</h4>
                    {record.procedures.length ? <BillingProcedureList procedures={record.procedures} /> : <p>Nenhum procedimento informado.</p>}
                  </section>
                  <section>
                    <h4>Checklist</h4>
                    <BillingChecklist items={record.billingChecklist} />
                  </section>
                </div>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-row">Nenhum atendimento encontrado para os filtros selecionados.</p>
      )}

      <div className="pagination-bar">
        <span>{props.visibleStart}-{props.visibleEnd} de {props.totalRecords}</span>
        <div className="pagination-actions">
          <IconButton label="Página anterior dos relatórios" title="Página anterior" onClick={() => props.onPageChange(Math.max(1, props.currentPage - 1))} disabled={props.currentPage === 1}><ChevronLeft size={18} /></IconButton>
          <span className="page-indicator">Página {props.currentPage} de {props.totalPages}</span>
          <IconButton label="Próxima página dos relatórios" title="Próxima página" onClick={() => props.onPageChange(Math.min(props.totalPages, props.currentPage + 1))} disabled={props.currentPage === props.totalPages}><ChevronRight size={18} /></IconButton>
        </div>
      </div>
    </DataPanel>
  );
}
