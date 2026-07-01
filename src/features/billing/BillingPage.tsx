import { type ReactNode, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  Info,
  ReceiptText,
  RefreshCw,
  TriangleAlert,
  Wallet,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getFaturamentosMedicos } from '../../services';
import { Modal } from '../../shared/components/Modal';
import { DateInput } from '../../shared/components/DateInput';
import { AlertMessage, Button, CheckboxField, ComboboxField, DataPanel, IconButton, SearchField } from '../../shared/components/ui';
import './billing.css';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { formatCurrency, PATIENT_EXPORT_PAGE_SIZE } from '../../shared/utils/formatters';
import type { AuthSession, Convenio, MedicalUserOption, Paciente } from '../../types';
import { UserAvatar } from '../users/UserAvatar';
import {
  buildBillingRecords,
  createEmptyBillingFilters,
  filterBillingRecords,
  groupBillingByConvenio,
  groupBillingByDoctor,
  summarizeBillingRecords,
  type BillingBreakdownItem,
  type BillingChecklistItem,
  type BillingRegimeFilter,
  type BillingRecord,
  type BillingStatusFilter,
} from './billingUtils';

type BillingPageProps = {
  session: AuthSession;
  medicalUsers: MedicalUserOption[];
  convenios: Convenio[];
  isAdmin: boolean;
  isMedical: boolean;
};

type BillingSummaryCardProps = {
  title: string;
  value: string;
  caption: string;
  tone: 'gross' | 'net' | 'glosa' | 'records' | 'paid' | 'attention';
  icon: ReactNode;
};

const BILLING_STATUS_FILTER_OPTIONS: Array<{ label: string; value: BillingStatusFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Pagos', value: 'paid' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Com glosa', value: 'glosa' },
  { label: 'Sem valor informado', value: 'missing' },
];

const BILLING_REGIME_FILTER_OPTIONS: Array<{ label: string; value: BillingRegimeFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Convenio', value: 'convenio' },
  { label: 'Particular', value: 'particular' },
];

function normalizeFilterOption(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function getFilterOptionLabel<TValue extends string>(options: Array<{ label: string; value: TValue }>, value: TValue) {
  return options.find((option) => option.value === value)?.label ?? options[0]?.label ?? '';
}

function getFilterOptionValue<TValue extends string>(options: Array<{ label: string; value: TValue }>, label: string) {
  const normalizedLabel = normalizeFilterOption(label);

  return options.find((option) => normalizeFilterOption(option.label) === normalizedLabel)?.value;
}

function BillingSummaryCard({ title, value, caption, tone, icon }: BillingSummaryCardProps) {
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

function BillingRankingPanel({ title, subtitle, items, emptyLabel }: BillingRankingPanelProps) {
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
                <span>{item.totalRecords} cirurgia(s) | {item.pendingCount} com pendencias</span>
              </div>
              <div className="billing-ranking-values">
                <strong>{formatCurrency(item.totalGrossAmount)}</strong>
                <span>Liquido {formatCurrency(item.totalNetAmount)}</span>
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

function BillingChecklist({ items }: { items: BillingChecklistItem[] }) {
  return (
    <dl className="billing-checklist">
      {items.map((item) => (
        <div key={item.label} className="billing-checklist-row">
          <dt>
            <span className={`billing-flag ${item.status}`}>{item.status === 'ok' ? 'Ok' : item.status === 'warning' ? 'Atencao' : 'Pendente'}</span>
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

function BillingProcedureList({ procedures }: { procedures: BillingRecord['procedures'] }) {
  return (
    <ul className="billing-procedure-list">
      {procedures.map((procedure, index) => (
        <li key={`${procedure.cbhpmCodigo || procedure.procedimento}-${index}`}>
          <div className="billing-procedure-content">
            <strong>{procedure.procedimento}</strong>
            <div className="billing-procedure-meta">
              <span className="billing-procedure-chip">{procedure.cbhpmCodigo || 'Sem codigo'}</span>
              {procedure.cbhpmPorte && (
                <span className="billing-procedure-chip">Porte {procedure.cbhpmPorte}</span>
              )}
            </div>
          </div>
          <span className="billing-procedure-value">
            {procedure.valorReferencia != null ? formatCurrency(procedure.valorReferencia) : 'Sem valor referencia'}
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

function BillingSummaryModal({ record, authToken, onClose }: BillingSummaryModalProps) {
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
            <span className="eyebrow">Informacoes resumidas</span>
            <h2 id="billing-summary-title">{record.patientName}</h2>
            <p className="billing-summary-modal-subtitle">{record.doctorName}</p>
          </div>
        </div>
        <IconButton label="Fechar informacoes resumidas" title="Fechar" tone="muted" onClick={onClose}>
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
            <span>Convenio / regime</span>
            <strong>{record.convenioName}</strong>
            <p>{record.regime === 'convenio' ? 'Convenio' : 'Particular'} | {record.authorizationCode || 'Sem autorizacao informada'}</p>
          </article>

          <article className="billing-summary-info-card billing-summary-support-card">
            <span>Status / suporte</span>
            <strong>{record.statusLabel}</strong>
            <p>{record.filesCount} anexo(s) | {record.pendingChecklistItems} pendencia(s)</p>
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
            <span>Liquido</span>
            <strong>{record.paymentHasNumericValue || record.glosaHasNumericValue ? formatCurrency(record.netAmount) : '-'}</strong>
          </article>
        </section>

        <section className="billing-detail-section billing-summary-main">
          <div className="billing-section-heading">
            <div>
              <span className="eyebrow">Procedimentos</span>
              <h4>Resumo dos codigos vinculados</h4>
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

function parseBillingDetailId(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getUniqueSortedOptions(values: Array<string | null | undefined>) {
  return [...new Set(
    values
      .map((value) => value?.trim() || '')
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }));
}

async function loadBillingPatients(token: string, filters: { search: string; medico: string; convenio: string; procedimento: string }) {
  const items: Paciente[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await getFaturamentosMedicos(token, {
      page,
      pageSize: PATIENT_EXPORT_PAGE_SIZE,
      search: filters.search,
      medico: filters.medico || undefined,
      convenio: filters.convenio || undefined,
      procedimento: filters.procedimento || undefined,
      sortBy: 'recent',
      sortDirection: 'desc',
    });

    items.push(...response.items);
    totalPages = response.totalPages;
    page += 1;
  } while (page <= totalPages);

  return items;
}

export function BillingPage({
  session,
  medicalUsers,
  convenios,
  isAdmin,
  isMedical,
}: BillingPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultDoctorFilter = isMedical ? session.user.nome : '';
  const [filters, setFilters] = useState(() => createEmptyBillingFilters(defaultDoctorFilter));
  const [statusFilterInput, setStatusFilterInput] = useState(() => getFilterOptionLabel(BILLING_STATUS_FILTER_OPTIONS, 'all'));
  const [regimeFilterInput, setRegimeFilterInput] = useState(() => getFilterOptionLabel(BILLING_REGIME_FILTER_OPTIONS, 'all'));
  const [summaryRecordId, setSummaryRecordId] = useState<number | null>(null);
  const [debouncedSearch] = useDebouncedValue(filters.search);
  const [debouncedDoctor] = useDebouncedValue(filters.medico);
  const [debouncedConvenio] = useDebouncedValue(filters.convenio);
  const [debouncedProcedure] = useDebouncedValue(filters.procedimento);
  const detailRecordId = parseBillingDetailId(searchParams.get('detalhe'));

  useEffect(() => {
    if (!isMedical) {
      return;
    }

    setFilters((current) => current.medico === session.user.nome
      ? current
      : { ...current, medico: session.user.nome });
  }, [isMedical, session.user.nome]);

  useEffect(() => {
    setStatusFilterInput(getFilterOptionLabel(BILLING_STATUS_FILTER_OPTIONS, filters.status));
  }, [filters.status]);

  useEffect(() => {
    setRegimeFilterInput(getFilterOptionLabel(BILLING_REGIME_FILTER_OPTIONS, filters.regime));
  }, [filters.regime]);

  const billingQuery = useQuery({
    queryKey: ['billingRecords', session.token, debouncedSearch, debouncedDoctor, debouncedConvenio, debouncedProcedure, isMedical ? session.user.id : 'all'],
    queryFn: () => loadBillingPatients(session.token, {
      search: debouncedSearch.trim(),
      medico: debouncedDoctor.trim(),
      convenio: debouncedConvenio.trim(),
      procedimento: debouncedProcedure.trim(),
    }),
    staleTime: 30 * 1000,
  });

  const billingScopeOptions = {
    restrictToMedicalUser: isMedical,
    currentMedicalUserId: session.user.id,
    currentMedicalUserName: session.user.nome,
  };
  const allBillingRecords = buildBillingRecords(billingQuery.data ?? []);
  const billingScopeRecords = filterBillingRecords(
    allBillingRecords,
    createEmptyBillingFilters(''),
    billingScopeOptions,
  );
  const billingRecords = filterBillingRecords(
    allBillingRecords,
    filters,
    billingScopeOptions,
  );
  const doctorFilterOptions = getUniqueSortedOptions([
    ...medicalUsers.map((user) => user.nome),
    ...billingScopeRecords.map((record) => record.doctorName),
  ]);
  const convenioFilterOptions = getUniqueSortedOptions([
    ...convenios.map((item) => item.descricaoConvenio),
    ...billingScopeRecords.map((record) => record.convenioName),
  ]);
  const hospitalFilterOptions = getUniqueSortedOptions(
    billingScopeRecords
      .map((record) => record.hospitalName)
      .filter((value) => value !== 'Nao informado'),
  );
  const procedureFilterOptions = getUniqueSortedOptions(
    billingScopeRecords.flatMap((record) => record.procedures.map((procedure) => procedure.procedimento)),
  );
  const summary = summarizeBillingRecords(billingRecords);
  const doctorBreakdown = groupBillingByDoctor(billingRecords).slice(0, 5);
  const convenioBreakdown = groupBillingByConvenio(billingRecords).slice(0, 5);
  const selectedRecord = detailRecordId == null
    ? null
    : billingRecords.find((record) => record.id === detailRecordId) ?? null;
  const summaryRecord = summaryRecordId == null
    ? null
    : billingRecords.find((record) => record.id === summaryRecordId) ?? null;
  const lastUpdatedLabel = billingQuery.dataUpdatedAt
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(billingQuery.dataUpdatedAt))
    : '';

  useEffect(() => {
    if (summaryRecordId == null) {
      return;
    }

    if (!billingRecords.some((record) => record.id === summaryRecordId)) {
      setSummaryRecordId(null);
    }
  }, [billingRecords, summaryRecordId]);

  const clearFilters = () => {
    setFilters(createEmptyBillingFilters(defaultDoctorFilter));
    setStatusFilterInput(getFilterOptionLabel(BILLING_STATUS_FILTER_OPTIONS, 'all'));
    setRegimeFilterInput(getFilterOptionLabel(BILLING_REGIME_FILTER_OPTIONS, 'all'));
  };

  const openBillingDetail = (recordId: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('detalhe', String(recordId));
    setSearchParams(nextParams);
  };

  const closeBillingDetail = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('detalhe');
    setSearchParams(nextParams);
  };

  if (detailRecordId != null) {
    return (
      <section className="workspace billing-workspace">
        <section className="billing-detail-view">
          <div className="billing-detail-toolbar">
            <Button className="billing-back-button" onClick={closeBillingDetail}>
              <ArrowLeft size={16} />
              Voltar para pacientes
            </Button>

            <div className="billing-detail-toolbar-actions">
              {lastUpdatedLabel && <span className="billing-detail-toolbar-note">Atualizado em {lastUpdatedLabel}</span>}
              <IconButton
                label="Atualizar faturamento medico"
                title="Atualizar faturamento"
                onClick={() => void billingQuery.refetch()}
                disabled={billingQuery.isFetching}
              >
                <RefreshCw size={18} />
              </IconButton>
            </div>
          </div>

          {isMedical && (
            <AlertMessage type="warning" icon={<Info size={17} />}>
              Visualizacao restrita aos pacientes vinculados ao medico {session.user.nome}.
            </AlertMessage>
          )}

          {billingQuery.error && (
            <AlertMessage type="error">
              {billingQuery.error instanceof Error ? billingQuery.error.message : 'Nao foi possivel carregar o faturamento.'}
            </AlertMessage>
          )}

          <DataPanel className="billing-detail-page">
            {billingQuery.isPending ? (
              <p className="empty-row" role="status">Carregando detalhes do faturamento...</p>
            ) : selectedRecord ? (
              <>
                <div className="billing-detail-header">
                  <div className="billing-patient-cell">
                    <UserAvatar
                      userId={selectedRecord.paciente.userId}
                      name={selectedRecord.patientName}
                      photo={selectedRecord.paciente.fotoPerfil}
                      authToken={session.token}
                      size="sm"
                    />
                    <div>
                      <span className="eyebrow">Detalhe do faturamento</span>
                      <h3>{selectedRecord.patientName}</h3>
                      <p>{selectedRecord.doctorName} | {selectedRecord.hospitalName}</p>
                    </div>
                  </div>
                  <span className={`status-pill ${selectedRecord.status === 'paid' ? 'ok' : selectedRecord.status === 'pending' ? 'warning' : 'inactive'}`}>
                    {selectedRecord.statusLabel}
                  </span>
                </div>

                <div className="billing-detail-kpis">
                  <div>
                    <span>Faturado</span>
                    <strong>{selectedRecord.paymentHasNumericValue ? formatCurrency(selectedRecord.paymentAmount) : selectedRecord.paymentRaw || '-'}</strong>
                  </div>
                  <div>
                    <span>Glosa</span>
                    <strong>{selectedRecord.glosaHasNumericValue ? formatCurrency(selectedRecord.glosaAmount) : selectedRecord.glosaRaw || '-'}</strong>
                  </div>
                  <div>
                    <span>Liquido</span>
                    <strong>{selectedRecord.paymentHasNumericValue || selectedRecord.glosaHasNumericValue ? formatCurrency(selectedRecord.netAmount) : '-'}</strong>
                  </div>
                </div>

                <section className="billing-detail-section">
                  <div className="billing-section-heading">
                    <div>
                      <span className="eyebrow">Resumo clinico-administrativo</span>
                      <h4>Dados usados no faturamento</h4>
                    </div>
                  </div>

                  <dl className="billing-detail-list">
                    <div>
                      <dt>Data da cirurgia</dt>
                      <dd>{selectedRecord.surgeryDateLabel}</dd>
                    </div>
                    <div>
                      <dt>Cirurgiao</dt>
                      <dd>{selectedRecord.doctorName}</dd>
                    </div>
                    <div>
                      <dt>Auxiliares</dt>
                      <dd>{selectedRecord.assistantNames.length ? selectedRecord.assistantNames.join(', ') : '-'}</dd>
                    </div>
                    <div>
                      <dt>Convenio / regime</dt>
                      <dd>{selectedRecord.convenioName} / {selectedRecord.regime === 'convenio' ? 'Convenio' : 'Particular'}</dd>
                    </div>
                    <div>
                      <dt>Autorizacao</dt>
                      <dd>{selectedRecord.authorizationCode || '-'}</dd>
                    </div>
                    <div>
                      <dt>Fornecedor OPME</dt>
                      <dd>{selectedRecord.opmeSupplier}</dd>
                    </div>
                    <div>
                      <dt>Arquivos de suporte</dt>
                      <dd>{selectedRecord.filesCount}</dd>
                    </div>
                    <div>
                      <dt>Pagamento bruto informado</dt>
                      <dd>{selectedRecord.paymentRaw || '-'}</dd>
                    </div>
                  </dl>
                </section>

                <section className="billing-detail-section">
                  <div className="billing-section-heading">
                    <div>
                      <span className="eyebrow">Codigos e procedimentos</span>
                      <h4>Procedimento principal e associados</h4>
                    </div>
                  </div>

                {selectedRecord.procedures.length ? (
                    <BillingProcedureList procedures={selectedRecord.procedures} />
                  ) : (
                    <p className="empty-row">Nenhum procedimento vinculado a esta cirurgia.</p>
                  )}
                </section>

                <section className="billing-detail-section">
                  <div className="billing-section-heading">
                    <div>
                      <span className="eyebrow">Checklist do faturamento</span>
                      <h4>Pontos solicitados para auditoria medica</h4>
                    </div>
                  </div>

                  <BillingChecklist items={selectedRecord.billingChecklist} />
                </section>
              </>
            ) : (
              <div className="billing-detail-empty">
                <TriangleAlert size={18} />
                <p>Este faturamento nao esta disponivel para a sua visao atual ou nao foi encontrado.</p>
              </div>
            )}
          </DataPanel>
        </section>
      </section>
    );
  }

  return (
    <section className="workspace billing-workspace">
      <section className="billing-hero">
        <div>
          <span className="eyebrow">Faturamento medico</span>
          <h2>Consulta financeira das cirurgias realizadas</h2>
          <p>
            Esta tela consolida o que ja foi preenchido no cadastro de pacientes para transformar cirurgia,
            convenio, OPME, autorizacao, pagamento, glosa e anexos em uma visao de faturamento para a equipe medica.
          </p>
        </div>

        <div className="billing-hero-meta">
          <span>Baseado no cadastro de pacientes</span>
          {lastUpdatedLabel && <span>Atualizado em {lastUpdatedLabel}</span>}
          {isMedical && <span>Consulta filtrada para {session.user.nome}</span>}
          {isAdmin && <span>Visao administrativa habilitada</span>}
        </div>
      </section>

      {(summary.nonNumericPaymentCount > 0 || summary.nonNumericGlosaCount > 0) && (
        <AlertMessage type="warning" icon={<TriangleAlert size={17} />}>
          {summary.nonNumericPaymentCount > 0 && `${summary.nonNumericPaymentCount} registro(s) possuem pagamento preenchido sem valor monetario estruturado. `}
          {summary.nonNumericGlosaCount > 0 && `${summary.nonNumericGlosaCount} registro(s) possuem glosa preenchida sem valor monetario estruturado.`}
        </AlertMessage>
      )}

      <DataPanel className="billing-filter-panel">
        <div className="data-header">
          <div>
            <span className="eyebrow">Consulta de faturamento</span>
            <h2>{summary.totalRecords} cirurgia(s) encontradas</h2>
          </div>

          <div className="table-tools billing-toolbar">
            <SearchField
              label="Buscar cirurgia faturada"
              value={filters.search}
              onValueChange={(value) => setFilters((current) => ({ ...current, search: value }))}
              placeholder="Paciente, procedimento, codigo, hospital..."
            />
            <IconButton
              label="Atualizar faturamento medico"
              title="Atualizar faturamento"
              onClick={() => void billingQuery.refetch()}
              disabled={billingQuery.isFetching}
            >
              <RefreshCw size={18} />
            </IconButton>
          </div>
        </div>

        <div className="billing-filter-grid">
          <ComboboxField
            className="filter-field"
            label="Cirurgiao"
            value={filters.medico}
            options={doctorFilterOptions}
            onValueChange={(value) => setFilters((current) => ({ ...current, medico: value }))}
            disabled={isMedical || !doctorFilterOptions.length}
            placeholder={isMedical ? session.user.nome : medicalUsers.length ? 'Todos os cirurgioes' : 'Nenhum medico cadastrado'}
            noOptionsLabel="Nenhum cirurgiao encontrado."
          />
          <ComboboxField
            className="filter-field"
            label="Convenio"
            value={filters.convenio}
            options={convenioFilterOptions}
            onValueChange={(value) => setFilters((current) => ({ ...current, convenio: value }))}
            disabled={!convenios.length && !filters.convenio}
            placeholder={convenios.length ? 'Todos os convenios' : 'Nenhum convenio cadastrado'}
            noOptionsLabel="Nenhum convenio encontrado."
          />
          <ComboboxField
            className="filter-field"
            label="Hospital"
            value={filters.hospital}
            options={hospitalFilterOptions}
            onValueChange={(value) => setFilters((current) => ({ ...current, hospital: value }))}
            placeholder="Todos os hospitais"
            noOptionsLabel="Nenhum hospital encontrado."
          />
          <ComboboxField
            className="filter-field"
            label="Procedimento"
            value={filters.procedimento}
            options={procedureFilterOptions}
            onValueChange={(value) => setFilters((current) => ({ ...current, procedimento: value }))}
            placeholder="Principal ou associado"
            noOptionsLabel="Nenhum procedimento encontrado."
          />
          <ComboboxField
            className="filter-field"
            label="Status"
            value={statusFilterInput}
            options={BILLING_STATUS_FILTER_OPTIONS.map((option) => option.label)}
            onValueChange={(value) => {
              setStatusFilterInput(value);

              const nextStatus = getFilterOptionValue(BILLING_STATUS_FILTER_OPTIONS, value);

              if (nextStatus) {
                setFilters((current) => ({ ...current, status: nextStatus }));
              }
            }}
            noOptionsLabel="Nenhum status encontrado."
          />
          <ComboboxField
            className="filter-field"
            label="Regime"
            value={regimeFilterInput}
            options={BILLING_REGIME_FILTER_OPTIONS.map((option) => option.label)}
            onValueChange={(value) => {
              setRegimeFilterInput(value);

              const nextRegime = getFilterOptionValue(BILLING_REGIME_FILTER_OPTIONS, value);

              if (nextRegime) {
                setFilters((current) => ({ ...current, regime: nextRegime }));
              }
            }}
            noOptionsLabel="Nenhum regime encontrado."
          />
          <DateInput
            id="billing-period-start"
            label="Data inicial"
            value={filters.periodStart}
            onChange={(value) => setFilters((current) => ({ ...current, periodStart: value }))}
          />
          <DateInput
            id="billing-period-end"
            label="Data final"
            value={filters.periodEnd}
            onChange={(value) => setFilters((current) => ({ ...current, periodEnd: value }))}
          />
          <CheckboxField
            className="billing-checkbox"
            label="Mostrar apenas cirurgias com pendencias de faturamento"
            checked={filters.onlyPendingItems}
            onCheckedChange={(checked) => setFilters((current) => ({ ...current, onlyPendingItems: checked }))}
          />
          <Button className="patient-clear-filters" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      </DataPanel>

      <section className="billing-summary-grid" aria-label="Resumo financeiro">
        <BillingSummaryCard
          title="Faturado informado"
          value={formatCurrency(summary.totalGrossAmount)}
          caption={`${summary.totalRecords} cirurgia(s) consideradas`}
          tone="gross"
          icon={<Wallet size={18} />}
        />
        <BillingSummaryCard
          title="Liquido estimado"
          value={formatCurrency(summary.totalNetAmount)}
          caption="Pagamento menos glosa informada"
          tone="net"
          icon={<ReceiptText size={18} />}
        />
        <BillingSummaryCard
          title="Glosas"
          value={formatCurrency(summary.totalGlosaAmount)}
          caption={`${summary.glosaCasesCount} cirurgia(s) com glosa`}
          tone="glosa"
          icon={<TriangleAlert size={18} />}
        />
        <BillingSummaryCard
          title="Cirurgias"
          value={String(summary.totalRecords)}
          caption={`${summary.particularCount} particulares | ${summary.convenioCount} por convenio`}
          tone="records"
          icon={<ClipboardList size={18} />}
        />
        <BillingSummaryCard
          title="Pagamentos"
          value={`${summary.paidCount} pagas`}
          caption={`${summary.pendingCount} pendentes | ${summary.missingAmountCount} sem valor`}
          tone="paid"
          icon={<CheckCircle2 size={18} />}
        />
        <BillingSummaryCard
          title="Pendencias"
          value={String(summary.recordsWithPendingItems)}
          caption={`${summary.authorizationCount} autorizacoes | ${summary.attachmentCount} com anexos`}
          tone="attention"
          icon={<Info size={18} />}
        />
      </section>

      <section className="billing-insights-grid">
        <BillingRankingPanel
          title="Cirurgioes com maior valor informado"
          subtitle="Equipe"
          items={doctorBreakdown}
          emptyLabel="Nenhum cirurgiao com faturamento no filtro atual."
        />
        <BillingRankingPanel
          title="Convenios e regime com maior concentracao"
          subtitle="Pagadores"
          items={convenioBreakdown}
          emptyLabel="Nenhum convenio ou regime encontrado."
        />
      </section>

      {billingQuery.error && (
        <AlertMessage type="error">
          {billingQuery.error instanceof Error ? billingQuery.error.message : 'Nao foi possivel carregar o faturamento.'}
        </AlertMessage>
      )}

      <DataPanel className="billing-table-panel">
        <div className="billing-section-heading">
          <div>
            <span className="eyebrow">Cirurgias faturadas</span>
            <h3>Grade de consulta</h3>
          </div>
          <span className="billing-inline-note">Totais calculados a partir dos campos de pagamento e glosa do cadastro.</span>
        </div>

        <div className="table-wrap">
          <table className="billing-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Cirurgiao</th>
                <th>Status</th>
                <th>Resumo</th>
                <th>Visualizar</th>
              </tr>
            </thead>
            <tbody>
              {billingQuery.isPending ? (
                <tr>
                  <td colSpan={5} className="empty-row">Carregando faturamento medico...</td>
                </tr>
              ) : billingRecords.length ? (
                billingRecords.map((record) => (
                  <tr key={record.id}>
                    <td data-label="Paciente">
                      <div className="billing-patient-cell">
                        <UserAvatar
                          userId={record.paciente.userId}
                          name={record.patientName}
                          photo={record.paciente.fotoPerfil}
                          authToken={session.token}
                          size="sm"
                        />
                        <div>
                          <strong>{record.patientName}</strong>
                          <span>{record.filesCount} anexo(s) | {record.pendingChecklistItems} pendencia(s)</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Cirurgiao">
                      <strong>{record.doctorName}</strong>
                      <span>{record.assistantNames.length ? `Auxiliares: ${record.assistantNames.join(', ')}` : 'Sem auxiliares informados'}</span>
                    </td>
                    <td data-label="Status">
                      <span className={`status-pill ${record.status === 'paid' ? 'ok' : record.status === 'pending' ? 'warning' : 'inactive'}`}>
                        {record.statusLabel}
                      </span>
                    </td>
                    <td data-label="Resumo">
                      <IconButton
                        className="billing-row-action"
                        label={`Informacoes resumidas de ${record.patientName}`}
                        title="Informacoes resumidas"
                        onClick={() => setSummaryRecordId(record.id)}
                      >
                        <FileText size={18} />
                      </IconButton>
                    </td>
                    <td data-label="Visualizar">
                      <IconButton
                        className="billing-row-action"
                        label={`Visualizar faturamento de ${record.patientName}`}
                        title="Visualizar faturamento"
                        onClick={() => openBillingDetail(record.id)}
                      >
                        <Eye size={18} />
                      </IconButton>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-row">Nenhuma cirurgia encontrada para os filtros informados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DataPanel>

      {summaryRecord && (
        <BillingSummaryModal
          record={summaryRecord}
          authToken={session.token}
          onClose={() => setSummaryRecordId(null)}
        />
      )}
    </section>
  );
}
