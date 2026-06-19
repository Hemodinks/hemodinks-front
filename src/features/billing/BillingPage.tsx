import { type ReactNode, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  FileText,
  Info,
  ReceiptText,
  RefreshCw,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import { getPacientes } from '../../services';
import { DateInput } from '../../shared/components/DateInput';
import { AlertMessage, Button, CheckboxField, DataPanel, IconButton, SearchField, SelectField, TextField } from '../../shared/components/ui';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { CONVENIOS_DATALIST_ID, formatCurrency, MEDICAL_USERS_DATALIST_ID, PATIENT_EXPORT_PAGE_SIZE } from '../../shared/utils/formatters';
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
  type BillingRecord,
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

async function loadBillingPatients(token: string, filters: { search: string; medico: string; convenio: string; procedimento: string }) {
  const items: Paciente[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await getPacientes(token, {
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
  const defaultDoctorFilter = isMedical ? session.user.nome : '';
  const [filters, setFilters] = useState(() => createEmptyBillingFilters(defaultDoctorFilter));
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [debouncedSearch] = useDebouncedValue(filters.search);
  const [debouncedDoctor] = useDebouncedValue(filters.medico);
  const [debouncedConvenio] = useDebouncedValue(filters.convenio);
  const [debouncedProcedure] = useDebouncedValue(filters.procedimento);

  useEffect(() => {
    if (!isMedical) {
      return;
    }

    setFilters((current) => current.medico === session.user.nome
      ? current
      : { ...current, medico: session.user.nome });
  }, [isMedical, session.user.nome]);

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

  const billingRecords = filterBillingRecords(
    buildBillingRecords(billingQuery.data ?? []),
    filters,
    {
      restrictToMedicalUser: isMedical,
      currentMedicalUserId: session.user.id,
      currentMedicalUserName: session.user.nome,
    },
  );
  const summary = summarizeBillingRecords(billingRecords);
  const doctorBreakdown = groupBillingByDoctor(billingRecords).slice(0, 5);
  const convenioBreakdown = groupBillingByConvenio(billingRecords).slice(0, 5);
  const selectedRecord = billingRecords.find((record) => record.id === selectedRecordId) ?? null;
  const lastUpdatedLabel = billingQuery.dataUpdatedAt
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(billingQuery.dataUpdatedAt))
    : '';

  useEffect(() => {
    if (!billingRecords.length) {
      if (selectedRecordId !== null) {
        setSelectedRecordId(null);
      }
      return;
    }

    if (selectedRecordId != null && billingRecords.some((record) => record.id === selectedRecordId)) {
      return;
    }

    setSelectedRecordId(billingRecords[0].id);
  }, [billingRecords, selectedRecordId]);

  const clearFilters = () => {
    setFilters(createEmptyBillingFilters(defaultDoctorFilter));
  };

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
          <TextField
            className="filter-field"
            label="Cirurgiao"
            type="search"
            list={MEDICAL_USERS_DATALIST_ID}
            value={filters.medico}
            onValueChange={(value) => setFilters((current) => ({ ...current, medico: value }))}
            disabled={isMedical || !medicalUsers.length}
            placeholder={isMedical ? session.user.nome : medicalUsers.length ? 'Todos os cirurgioes' : 'Nenhum medico cadastrado'}
          />
          <TextField
            className="filter-field"
            label="Convenio"
            type="search"
            list={CONVENIOS_DATALIST_ID}
            value={filters.convenio}
            onValueChange={(value) => setFilters((current) => ({ ...current, convenio: value }))}
            disabled={!convenios.length && !filters.convenio}
            placeholder={convenios.length ? 'Todos os convenios' : 'Nenhum convenio cadastrado'}
          />
          <TextField
            className="filter-field"
            label="Hospital"
            type="search"
            value={filters.hospital}
            onValueChange={(value) => setFilters((current) => ({ ...current, hospital: value }))}
            placeholder="Todos os hospitais"
          />
          <TextField
            className="filter-field"
            label="Procedimento"
            type="search"
            value={filters.procedimento}
            onValueChange={(value) => setFilters((current) => ({ ...current, procedimento: value }))}
            placeholder="Principal ou associado"
          />
          <SelectField
            className="filter-field"
            label="Status"
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as typeof current.status }))}
          >
            <option value="all">Todos</option>
            <option value="paid">Pagos</option>
            <option value="pending">Pendentes</option>
            <option value="glosa">Com glosa</option>
            <option value="missing">Sem valor informado</option>
          </SelectField>
          <SelectField
            className="filter-field"
            label="Regime"
            value={filters.regime}
            onChange={(event) => setFilters((current) => ({ ...current, regime: event.target.value as typeof current.regime }))}
          >
            <option value="all">Todos</option>
            <option value="convenio">Convenio</option>
            <option value="particular">Particular</option>
          </SelectField>
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

      <section className="billing-results-layout">
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
                  <th>Data / hospital</th>
                  <th>Cirurgiao</th>
                  <th>Procedimento</th>
                  <th>Convenio</th>
                  <th>Faturado</th>
                  <th>Glosa</th>
                  <th>Liquido</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {billingQuery.isPending ? (
                  <tr>
                    <td colSpan={10} className="empty-row">Carregando faturamento medico...</td>
                  </tr>
                ) : billingRecords.length ? (
                  billingRecords.map((record) => (
                    <tr key={record.id} className={selectedRecordId === record.id ? 'is-selected' : undefined}>
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
                      <td data-label="Data / hospital">
                        <strong>{record.surgeryDateLabel}</strong>
                        <span>{record.hospitalName}</span>
                      </td>
                      <td data-label="Cirurgiao">
                        <strong>{record.doctorName}</strong>
                        <span>{record.assistantNames.length ? `Auxiliares: ${record.assistantNames.join(', ')}` : 'Sem auxiliares informados'}</span>
                      </td>
                      <td data-label="Procedimento">
                        <strong>{record.primaryProcedureLabel || 'Nao informado'}</strong>
                        <span>{record.procedures.length} procedimento(s)</span>
                      </td>
                      <td data-label="Convenio">
                        <strong>{record.convenioName}</strong>
                        <span>{record.authorizationCode || 'Sem autorizacao'}</span>
                      </td>
                      <td data-label="Faturado">{record.paymentHasNumericValue ? formatCurrency(record.paymentAmount) : record.paymentRaw || '-'}</td>
                      <td data-label="Glosa">{record.glosaHasNumericValue ? formatCurrency(record.glosaAmount) : record.glosaRaw || '-'}</td>
                      <td data-label="Liquido">{record.paymentHasNumericValue || record.glosaHasNumericValue ? formatCurrency(record.netAmount) : '-'}</td>
                      <td data-label="Status">
                        <span className={`status-pill ${record.status === 'paid' ? 'ok' : record.status === 'pending' ? 'warning' : 'inactive'}`}>
                          {record.statusLabel}
                        </span>
                      </td>
                      <td data-label="Acoes">
                        <Button className="billing-row-button" onClick={() => setSelectedRecordId(record.id)}>
                          Ver detalhes
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="empty-row">Nenhuma cirurgia encontrada para os filtros informados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DataPanel>

        <DataPanel className="billing-detail-panel">
          {selectedRecord ? (
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
                  <ul className="billing-procedure-list">
                    {selectedRecord.procedures.map((procedure, index) => (
                      <li key={`${procedure.cbhpmCodigo || procedure.procedimento}-${index}`}>
                        <div>
                          <strong>{procedure.procedimento}</strong>
                          <span>{procedure.cbhpmCodigo || 'Sem codigo'} {procedure.cbhpmPorte ? `| Porte ${procedure.cbhpmPorte}` : ''}</span>
                        </div>
                        <span>{procedure.valorReferencia != null ? formatCurrency(procedure.valorReferencia) : 'Sem valor referencia'}</span>
                      </li>
                    ))}
                  </ul>
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
              <Activity size={18} />
              <p>Selecione uma cirurgia na grade para ver o detalhamento completo do faturamento.</p>
            </div>
          )}
        </DataPanel>
      </section>
    </section>
  );
}
