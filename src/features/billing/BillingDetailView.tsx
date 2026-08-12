import { ArrowLeft, Info, RefreshCw, TriangleAlert } from 'lucide-react';
import { AlertMessage, Button, DataPanel, IconButton } from '../../shared/components/ui';
import { formatCurrency, formatPersonName } from '../../shared/utils/formatters';
import { UserAvatar } from '../users/UserAvatar';
import { BillingChecklist, BillingProcedureList } from './BillingPageComponents';
import type { BillingRecord } from './billingTypes';

type BillingDetailViewProps = {
  record: BillingRecord | null;
  authToken: string;
  medicalUserName: string;
  isMedical: boolean;
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  lastUpdatedLabel: string;
  onBack: () => void;
  onRefresh: () => void;
};

export function BillingDetailView({
  record,
  authToken,
  medicalUserName,
  isMedical,
  isPending,
  isFetching,
  error,
  lastUpdatedLabel,
  onBack,
  onRefresh,
}: BillingDetailViewProps) {
  return (
    <section className="workspace billing-workspace">
      <section className="billing-detail-view">
        <div className="billing-detail-toolbar">
          <Button className="billing-back-button" onClick={onBack}>
            <ArrowLeft size={16} />
            Voltar para pacientes
          </Button>
          <div className="billing-detail-toolbar-actions">
            {lastUpdatedLabel && <span className="billing-detail-toolbar-note">Atualizado em {lastUpdatedLabel}</span>}
            <IconButton
              label="Atualizar faturamento médico"
              title="Atualizar faturamento"
              onClick={onRefresh}
              disabled={isFetching}
            >
              <RefreshCw size={18} />
            </IconButton>
          </div>
        </div>

        {isMedical && (
          <AlertMessage type="warning" icon={<Info size={17} />}>
            Visualização restrita aos pacientes vinculados ao médico {formatPersonName(medicalUserName)}.
          </AlertMessage>
        )}
        {Boolean(error) && (
          <AlertMessage type="error">
            {error instanceof Error ? error.message : 'Não foi possível carregar o faturamento.'}
          </AlertMessage>
        )}

        <DataPanel className="billing-detail-page">
          {isPending ? (
            <p className="empty-row" role="status">Carregando detalhes do faturamento...</p>
          ) : record ? (
            <>
              <div className="billing-detail-header">
                <div className="billing-patient-cell">
                  <UserAvatar
                    userId={record.paciente.userId}
                    name={record.patientName}
                    photo={record.paciente.fotoPerfil}
                    authToken={authToken}
                    size="sm"
                  />
                  <div>
                    <span className="eyebrow">Detalhe do faturamento</span>
                    <h3>{record.patientName}</h3>
                    <p>{record.doctorName} | {record.hospitalName}</p>
                  </div>
                </div>
                <span className={`status-pill ${record.status === 'paid' ? 'ok' : record.status === 'pending' ? 'warning' : 'inactive'}`}>
                  {record.statusLabel}
                </span>
              </div>

              <div className="billing-detail-kpis">
                <div><span>Faturado</span><strong>{record.paymentHasNumericValue ? formatCurrency(record.paymentAmount) : record.paymentRaw || '-'}</strong></div>
                <div><span>Glosa</span><strong>{record.glosaHasNumericValue ? formatCurrency(record.glosaAmount) : record.glosaRaw || '-'}</strong></div>
                <div><span>Líquido</span><strong>{record.paymentHasNumericValue || record.glosaHasNumericValue ? formatCurrency(record.netAmount) : '-'}</strong></div>
              </div>

              <section className="billing-detail-section">
                <div className="billing-section-heading">
                  <div><span className="eyebrow">Resumo clínico-administrativo</span><h4>Dados usados no faturamento</h4></div>
                </div>
                <dl className="billing-detail-list">
                  <div><dt>Data da cirurgia</dt><dd>{record.surgeryDateLabel}</dd></div>
                  <div><dt>Cirurgião</dt><dd>{record.doctorName}</dd></div>
                  <div><dt>Auxiliares</dt><dd>{record.assistantNames.length ? record.assistantNames.join(', ') : '-'}</dd></div>
                  <div><dt>Convênio / regime</dt><dd>{record.convenioName} / {record.regime === 'convenio' ? 'Convênio' : 'Particular'}</dd></div>
                  <div><dt>Autorização</dt><dd>{record.authorizationCode || '-'}</dd></div>
                  <div><dt>Fornecedor OPME</dt><dd>{record.opmeSupplier}</dd></div>
                  <div><dt>Arquivos de suporte</dt><dd>{record.filesCount}</dd></div>
                  <div><dt>Pagamento bruto informado</dt><dd>{record.paymentRaw || '-'}</dd></div>
                  <div><dt>Data do pagamento</dt><dd>{record.paymentDateLabel}</dd></div>
                </dl>
              </section>

              <section className="billing-detail-section">
                <div className="billing-section-heading">
                  <div><span className="eyebrow">Códigos e procedimentos</span><h4>Procedimento principal e associados</h4></div>
                </div>
                {record.procedures.length
                  ? <BillingProcedureList procedures={record.procedures} />
                  : <p className="empty-row">Nenhum procedimento vinculado a esta cirurgia.</p>}
              </section>

              <section className="billing-detail-section">
                <div className="billing-section-heading">
                  <div><span className="eyebrow">Checklist do faturamento</span><h4>Pontos solicitados para auditoria médica</h4></div>
                </div>
                <BillingChecklist items={record.billingChecklist} />
              </section>
            </>
          ) : (
            <div className="billing-detail-empty">
              <TriangleAlert size={18} />
              <p>Este faturamento não está disponível para a sua visão atual ou não foi encontrado.</p>
            </div>
          )}
        </DataPanel>
      </section>
    </section>
  );
}
