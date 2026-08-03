import { useAsyncOperation } from '../../../shared/hooks/useAsyncOperation';
import { receiptExtensionFromBlob } from '../receiptFileValidation';
import type { ReceivablesWorkflowOptions } from './receivablesWorkflowActionTypes';

export function useReceivableQueryActions({
  session,
  receivables,
  setError,
}: ReceivablesWorkflowOptions) {
  const filtersOperation = useAsyncOperation(async (_signal, page: number) => {
    const competenciaInicio = receivables.financeFilters.competencia
      ? `${receivables.financeFilters.competencia}-01`
      : undefined;
    const competenciaFim = receivables.financeFilters.competencia
      ? new Date(
          Number(receivables.financeFilters.competencia.slice(0, 4)),
          Number(receivables.financeFilters.competencia.slice(5, 7)),
          0,
        )
          .toISOString()
          .slice(0, 10)
      : undefined;
    return Promise.all([
      receivables.searchReceivables(
        {
          page,
          pageSize: 10,
          termo: receivables.financeFilters.termo || undefined,
          status: receivables.financeFilters.status || undefined,
          vencimentoInicio: receivables.financeFilters.vencimentoInicio || undefined,
          vencimentoFim: receivables.financeFilters.vencimentoFim || undefined,
          convenioId: receivables.financeFilters.convenioId || undefined,
          medicoId: receivables.financeFilters.medicoId || undefined,
          pacienteId: receivables.financeFilters.pacienteId || undefined,
        },
        session.token,
      ),
      receivables.loadSummary(
        {
          inicio: competenciaInicio,
          fim: competenciaFim,
          convenioId: receivables.financeFilters.convenioId || undefined,
          medicoId: receivables.financeFilters.medicoId || undefined,
          pacienteId: receivables.financeFilters.pacienteId || undefined,
        },
        session.token,
      ),
    ]);
  });

  const applyFilters = async (page = 1) => {
    setError('');
    try {
      const [paged, resumo] = await filtersOperation.execute(page);
      receivables.setContas(paged.items);
      receivables.setFinancePage({
        page: paged.page,
        totalPages: paged.totalPages,
        totalItems: paged.totalItems,
      });
      receivables.setFinanceiroResumo(resumo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível filtrar o financeiro.');
    }
  };

  const downloadReceipt = async (id: number) => {
    try {
      const blob = await receivables.downloadReceiptFile(id, session.token);
      const extension = receiptExtensionFromBlob(blob);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `comprovante-${id}.${extension}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível baixar o comprovante.');
    }
  };

  return { isLoading: filtersOperation.isLoading, applyFilters, downloadReceipt };
}
