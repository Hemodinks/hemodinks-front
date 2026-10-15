import { Info, TriangleAlert } from 'lucide-react';
import type { AuthSession } from '../../types';
import { AlertMessage } from '../../shared/components/ui';
import { ReportsFiltersPanel } from './ReportsFiltersPanel';
import { ReportsList } from './ReportsList';
import { ReportsSummary } from './ReportsSummary';
import { useReportsPage } from './useReportsPage';
import '../billing/billing.css';
import './reports.css';
import { BillingPendingItemsModal } from '../billing/BillingPendingItemsModal';
import { useBillingChecklistDialog } from '../billing/useBillingChecklistDialog';

type Props = {
  session: AuthSession;
  companyName: string;
  isMedical: boolean;
};

export function ReportsPage({ session, companyName, isMedical }: Props) {
  const report = useReportsPage({ session, companyName, isMedical });
  const checklist = useBillingChecklistDialog(report.records, JSON.stringify([session.token, session.user.clinicaId, report.appliedFilters]));
  return (
    <section className="workspace billing-workspace reports-workspace" data-tour="reports-overview">
      {isMedical && <AlertMessage type="warning" icon={<Info size={17} />}>Os dados estão restritos aos atendimentos vinculados ao médico autenticado.</AlertMessage>}
      {report.unavailableCatalogs.length > 0 && (
        <AlertMessage type="warning" icon={<TriangleAlert size={17} />}>
          Os filtros de {report.unavailableCatalogs.join(' e ')} não estão disponíveis para este acesso. Os demais dados continuam protegidos e funcionais.
        </AlertMessage>
      )}
      {report.filterError && <AlertMessage type="error">{report.filterError}</AlertMessage>}
      {report.exportError && <AlertMessage type="error">{report.exportError}</AlertMessage>}
      {report.queryError && <AlertMessage type="error">{report.queryError instanceof Error ? report.queryError.message : 'Não foi possível carregar os relatórios.'}</AlertMessage>}

      <ReportsFiltersPanel
        filters={report.filters}
        setFilters={report.setFilters}
        options={report.options}
        resultCount={report.records.length}
        isFetching={report.isFetching}
        exportLoading={report.exportLoading}
        exportDetailLevel={report.exportDetailLevel}
        onExportDetailLevelChange={report.setExportDetailLevel}
        onApply={report.applyFilters}
        onClear={report.clearFilters}
        onRefresh={report.refresh}
        onExport={(format) => void report.handleExport(format)}
      />
      <ReportsSummary summary={report.summary} pendingItemsCount={report.records.reduce((sum, record) => sum + record.pendingChecklistItems, 0)} onOpenChecklist={() => checklist.open()} />
      <ReportsList
        records={report.visibleRecords}
        isPending={report.isPending}
        currentPage={report.currentPage}
        totalPages={report.totalPages}
        visibleStart={report.visibleStart}
        visibleEnd={report.visibleEnd}
        totalRecords={report.records.length}
        individualExportLoadingId={report.individualExportLoadingId}
        onPageChange={report.setCurrentPage}
        onExportIndividualPdf={(record) => void report.handleIndividualExport(record)}
        onOpenChecklist={(record) => checklist.open(record.id)}
      />
      {checklist.isOpen && <BillingPendingItemsModal records={checklist.records} individual={checklist.individual} onClose={checklist.close} />}
    </section>
  );
}
