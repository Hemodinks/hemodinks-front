import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  ReceiptText,
  Info,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AlertMessage, DataPanel, IconButton } from '../../shared/components/ui';
import './billing.css';
import { formatCurrency, formatPersonName } from '../../shared/utils/formatters';
import { UserAvatar } from '../users/UserAvatar';
import {
  BillingRankingPanel,
  BillingSummaryCard,
  BillingSummaryModal,
} from './BillingPageComponents';
import { BillingDetailView } from './BillingDetailView';
import { BillingFiltersPanel } from './BillingFiltersPanel';
import {
  areBillingFiltersEqual,
  getUniqueSortedOptions,
  getBillingPage,
  loadBillingPatients,
  parseBillingDetailId,
  type BillingSortField,
} from './billingPageUtils';
import {
  buildBillingRecords,
  createEmptyBillingFilters,
  filterBillingRecords,
  groupBillingByConvenio,
  groupBillingByDoctor,
  summarizeBillingRecords,
} from './billingUtils';
import type { BillingPageProps } from './billingPageTypes';

const BILLING_PAGE_SIZE = 10;

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
  const [appliedFilters, setAppliedFilters] = useState(() => createEmptyBillingFilters(defaultDoctorFilter));
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<BillingSortField>('patient');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [summaryRecordId, setSummaryRecordId] = useState<number | null>(null);
  const detailRecordId = parseBillingDetailId(searchParams.get('detalhe'));

  useEffect(() => {
    if (!isMedical) {
      return;
    }

    setFilters((current) => current.medico === session.user.nome
      ? current
      : { ...current, medico: session.user.nome });
    setAppliedFilters((current) => current.medico === session.user.nome
      ? current
      : { ...current, medico: session.user.nome });
  }, [isMedical, session.user.nome]);

  const billingQuery = useQuery({
    queryKey: [
      'billingRecords',
      session.token,
      appliedFilters.search,
      appliedFilters.medico,
      appliedFilters.convenio,
      appliedFilters.procedimento,
      appliedFilters.competenciaInicio,
      appliedFilters.competenciaFinal,
      isMedical ? session.user.id : 'all',
    ],
    queryFn: () => loadBillingPatients(session.token, {
      search: appliedFilters.search.trim(),
      medico: appliedFilters.medico.trim(),
      convenio: appliedFilters.convenio.trim(),
      procedimento: appliedFilters.procedimento.trim(),
      competenciaInicio: appliedFilters.competenciaInicio,
      competenciaFinal: appliedFilters.competenciaFinal,
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
    createEmptyBillingFilters('', ''),
    billingScopeOptions,
  );
  const billingRecords = filterBillingRecords(
    allBillingRecords,
    appliedFilters,
    billingScopeOptions,
  );
  const billingPage = getBillingPage(billingRecords, {
    currentPage,
    pageSize: BILLING_PAGE_SIZE,
    sortBy,
    sortDirection,
  });
  const {
    totalPages,
    visiblePage,
    visibleStart,
    visibleEnd,
    records: visibleBillingRecords,
  } = billingPage;

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const doctorFilterOptions = getUniqueSortedOptions([
    ...medicalUsers.map((user) => formatPersonName(user.nome)),
    ...billingScopeRecords.map((record) => record.doctorName),
  ]);
  const convenioFilterOptions = getUniqueSortedOptions([
    ...convenios.map((item) => item.descricaoConvenio),
    ...billingScopeRecords.map((record) => record.convenioName),
  ]);
  const hospitalFilterOptions = getUniqueSortedOptions(
    billingScopeRecords
      .map((record) => record.hospitalName)
      .filter((value) => value !== 'Não informado'),
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
    const nextFilters = createEmptyBillingFilters(defaultDoctorFilter);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setCurrentPage(1);
  };

  const applyFilters = () => {
    const nextFilters = {
      ...filters,
      search: filters.search.trim(),
      medico: filters.medico.trim(),
      convenio: filters.convenio.trim(),
      hospital: filters.hospital.trim(),
      procedimento: filters.procedimento.trim(),
    };

    if (areBillingFiltersEqual(nextFilters, appliedFilters)) {
      setCurrentPage(1);
      void billingQuery.refetch();
      return;
    }

    setCurrentPage(1);
    setAppliedFilters(nextFilters);
  };

  const changeSort = (field: BillingSortField) => {
    setCurrentPage(1);
    setSortDirection((currentDirection) => sortBy === field && currentDirection === 'asc' ? 'desc' : 'asc');
    setSortBy(field);
  };

  const updateCompetenciaInicio = (value: string) => {
    setFilters((current) => ({
      ...current,
      competenciaInicio: value,
      competenciaFinal: value && current.competenciaFinal && current.competenciaFinal < value
        ? value
        : current.competenciaFinal,
    }));
  };

  const updateCompetenciaFinal = (value: string) => {
    setFilters((current) => ({
      ...current,
      competenciaInicio: value && current.competenciaInicio && current.competenciaInicio > value
        ? value
        : current.competenciaInicio,
      competenciaFinal: value,
    }));
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
      <BillingDetailView
        record={selectedRecord}
        authToken={session.token}
        medicalUserName={session.user.nome}
        isMedical={isMedical}
        isPending={billingQuery.isPending}
        isFetching={billingQuery.isFetching}
        error={billingQuery.error}
        lastUpdatedLabel={lastUpdatedLabel}
        onBack={closeBillingDetail}
        onRefresh={() => void billingQuery.refetch()}
      />
    );
  }

  return (
    <section className="workspace billing-workspace">
      {(summary.nonNumericPaymentCount > 0 || summary.nonNumericGlosaCount > 0) && (
        <AlertMessage type="warning" icon={<TriangleAlert size={17} />}>
          {summary.nonNumericPaymentCount > 0 && `${summary.nonNumericPaymentCount} registro(s) possuem pagamento preenchido sem valor monetário estruturado. `}
          {summary.nonNumericGlosaCount > 0 && `${summary.nonNumericGlosaCount} registro(s) possuem glosa preenchida sem valor monetário estruturado.`}
        </AlertMessage>
      )}

      <BillingFiltersPanel
        filters={filters}
        setFilters={setFilters}
        resultCount={summary.totalRecords}
        doctorOptions={doctorFilterOptions}
        convenioOptions={convenioFilterOptions}
        hospitalOptions={hospitalFilterOptions}
        procedureOptions={procedureFilterOptions}
        medicalUserName={session.user.nome}
        medicalUsersCount={medicalUsers.length}
        conveniosCount={convenios.length}
        isMedical={isMedical}
        isFetching={billingQuery.isFetching}
        onRefresh={() => void billingQuery.refetch()}
        onApply={applyFilters}
        onClear={clearFilters}
        onStartMonthChange={updateCompetenciaInicio}
        onEndMonthChange={updateCompetenciaFinal}
      />

      <section className="billing-summary-grid" aria-label="Resumo financeiro">
        <BillingSummaryCard
          title="Faturado informado"
          value={formatCurrency(summary.totalGrossAmount)}
          caption={`${summary.totalRecords} cirurgia(s) consideradas`}
          tone="gross"
          icon={<Wallet size={18} />}
        />
        <BillingSummaryCard
          title="Líquido estimado"
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
          caption={`${summary.particularCount} particulares | ${summary.convenioCount} por convênio`}
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
          title="Pendências"
          value={String(summary.recordsWithPendingItems)}
          caption={`${summary.authorizationCount} autorizações | ${summary.attachmentCount} com anexos`}
          tone="attention"
          icon={<Info size={18} />}
        />
      </section>

      <section className="billing-insights-grid">
        <BillingRankingPanel
          title="Cirurgiões com maior valor informado"
          subtitle="Equipe"
          items={doctorBreakdown}
          emptyLabel="Nenhum cirurgião com faturamento no filtro atual."
        />
        <BillingRankingPanel
          title="Convênios e regime com maior concentração"
          subtitle="Pagadores"
          items={convenioBreakdown}
          emptyLabel="Nenhum convênio ou regime encontrado."
        />
      </section>

      {billingQuery.error && (
        <AlertMessage type="error">
          {billingQuery.error instanceof Error ? billingQuery.error.message : 'Não foi possível carregar o faturamento.'}
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
                <th>
                  <button type="button" className="sort-header-button" onClick={() => changeSort('patient')} aria-sort={sortBy === 'patient' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Paciente
                    {sortBy === 'patient' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => changeSort('doctor')} aria-sort={sortBy === 'doctor' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Cirurgião
                    {sortBy === 'doctor' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => changeSort('status')} aria-sort={sortBy === 'status' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Status
                    {sortBy === 'status' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>Resumo</th>
                <th>Visualizar</th>
              </tr>
            </thead>
            <tbody>
              {billingQuery.isPending ? (
                <tr>
                  <td colSpan={5} className="empty-row">Carregando faturamento médico...</td>
                </tr>
              ) : visibleBillingRecords.length ? (
                visibleBillingRecords.map((record) => (
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
                          <span>{record.filesCount} anexo(s) | {record.pendingChecklistItems} pendência(s)</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Cirurgião">
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
                        label={`Informações resumidas de ${record.patientName}`}
                        title="Informações resumidas"
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
        <div className="pagination-bar">
          <span>{visibleStart}-{visibleEnd} de {billingRecords.length}</span>
          <div className="pagination-actions">
            <IconButton
              label="Página anterior do faturamento"
              title="Página anterior"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={visiblePage === 1}
            >
              <ChevronLeft size={18} />
            </IconButton>
            <span className="page-indicator">Página {visiblePage} de {totalPages}</span>
            <IconButton
              label="Próxima página do faturamento"
              title="Próxima página"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={visiblePage === totalPages}
            >
              <ChevronRight size={18} />
            </IconButton>
          </div>
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
