import { useState } from 'react';
import { getErrorMessage } from '../../shared/utils/formatters';
import type { ReportExportFormat, ReportRecord } from './reportTypes';
import type { ReportFilters } from './reportTypes';
import { exportReport } from './export/reportExporter';
import { exportIndividualBillingPdf } from './export/individualBillingPdfExporter';

function describeFilters(filters: ReportFilters) {
  const lines: string[] = [];
  if (filters.requestStartDate || filters.requestEndDate) {
    lines.push(`Período da solicitação: ${filters.requestStartDate || 'início'} a ${filters.requestEndDate || 'hoje'}`);
  }
  if (filters.startDate || filters.endDate) {
    lines.push(`Período do atendimento: ${filters.startDate || 'início'} a ${filters.endDate || 'hoje'}`);
  }
  if (filters.paymentStartDate || filters.paymentEndDate) {
    lines.push(`Período do pagamento: ${filters.paymentStartDate || 'início'} a ${filters.paymentEndDate || 'hoje'}`);
  }
  const selections = [filters.doctors, filters.teams, filters.medicalGroups, filters.hospitals, filters.convenios, filters.procedures, filters.opmeSuppliers].flat();
  if (selections.length) lines.push(`Filtros: ${selections.join(', ')}`);
  const statusLabels: Record<ReportFilters['status'], string> = { all: 'Todos', paid: 'Pagos', pending: 'Pendentes', glosa: 'Com glosa', missing: 'Sem valor informado' };
  const regimeLabels: Record<ReportFilters['regime'], string> = { all: 'Todos', convenio: 'Convênio', particular: 'Particular' };
  if (filters.status !== 'all') lines.push(`Status: ${statusLabels[filters.status]}`);
  if (filters.regime !== 'all') lines.push(`Regime: ${regimeLabels[filters.regime]}`);
  if (filters.onlyPendingItems) lines.push('Somente itens com pendências');
  return lines.length ? lines : ['Todos os registros'];
}

export function useReportExport(records: ReportRecord[], companyName: string, sessionToken: string, filters: ReportFilters) {
  const [exportLoading, setExportLoading] = useState(false);
  const [individualExportLoadingId, setIndividualExportLoadingId] = useState<number | null>(null);
  const [exportError, setExportError] = useState('');

  const handleExport = async (format: ReportExportFormat) => {
    if (!records.length) {
      setExportError('Não há registros no filtro atual para exportar.');
      return;
    }
    setExportLoading(true);
    setExportError('');
    try {
      await exportReport({ format, records, companyName, sessionToken, contextLines: describeFilters(filters) });
    } catch (error) {
      setExportError(getErrorMessage(error));
    } finally {
      setExportLoading(false);
    }
  };

  const handleIndividualExport = async (record: ReportRecord) => {
    if (individualExportLoadingId != null) return;
    setIndividualExportLoadingId(record.id);
    setExportError('');
    try {
      await exportIndividualBillingPdf(record, companyName, sessionToken);
    } catch (error) {
      setExportError(getErrorMessage(error));
    } finally {
      setIndividualExportLoadingId(null);
    }
  };

  return { exportLoading, individualExportLoadingId, exportError, handleExport, handleIndividualExport };
}
