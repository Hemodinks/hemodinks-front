import type { ChangeEvent, FormEvent } from 'react';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import type { RunBillingAction } from './billingWorkflowTypes';
import { downloadGeneratedReceipt } from './receiptDocument';
import type { useReceivables } from './useReceivables';
import { useAsyncOperation } from '../../shared/hooks/useAsyncOperation';
import { isSupportedReceiptFile, receiptExtensionFromBlob } from './receiptFileValidation';

type ReceivablesState = ReturnType<typeof useReceivables>;

export type ReceivablesWorkflowOptions = {
  session: AuthSession;
  receivables: ReceivablesState;
  run: RunBillingAction;
  setError: (message: string) => void;
};

export function useReceivablesWorkflowActions({
  session,
  receivables,
  run,
  setError,
}: ReceivablesWorkflowOptions) {
  const {
    accountDraft,
    cancelReason,
    cancelReceivable,
    contas,
    downloadReceiptFile,
    financeFilters,
    loadSummary,
    receipt,
    registerReceipt,
    reversalReason,
    reversalTarget,
    reverseReceipt,
    saveReceivable,
    searchReceivables,
    selectedAccount,
    setAccountDraft,
    setCancelReason,
    setContas,
    setFinancePage,
    setFinanceiroResumo,
    setReceipt,
    setReceiptToast,
    setReversalReason,
    setReversalTarget,
    setSelectedAccount,
    uploadReceipt,
  } = receivables;
  const filtersOperation = useAsyncOperation(async (_signal, page: number) => {
    const competenciaInicio = financeFilters.competencia
      ? `${financeFilters.competencia}-01`
      : undefined;
    const competenciaFim = financeFilters.competencia
      ? new Date(
          Number(financeFilters.competencia.slice(0, 4)),
          Number(financeFilters.competencia.slice(5, 7)),
          0,
        )
          .toISOString()
          .slice(0, 10)
      : undefined;
    const common = {
      inicio: competenciaInicio,
      fim: competenciaFim,
      convenioId: financeFilters.convenioId || undefined,
      medicoId: financeFilters.medicoId || undefined,
      pacienteId: financeFilters.pacienteId || undefined,
    };
    return Promise.all([
      searchReceivables(
        {
          page,
          pageSize: 10,
          termo: financeFilters.termo || undefined,
          status: financeFilters.status || undefined,
          vencimentoInicio: financeFilters.vencimentoInicio || undefined,
          vencimentoFim: financeFilters.vencimentoFim || undefined,
          convenioId: financeFilters.convenioId || undefined,
          medicoId: financeFilters.medicoId || undefined,
          pacienteId: financeFilters.pacienteId || undefined,
        },
        session.token,
      ),
      loadSummary(common, session.token),
    ]);
  });

  const submitReversal = (event: FormEvent) => {
    event.preventDefault();
    if (!reversalTarget) return;
    void run(
      () => reverseReceipt(reversalTarget.id, reversalReason, session.token),
      'Recebimento estornado e saldo recalculado.',
    ).then(() => {
      setReversalTarget(null);
      setReversalReason('');
    });
  };

  const submitReceipt = async (event: FormEvent) => {
    event.preventDefault();
    setReceiptToast(null);
    const account = contas.find((item) => item.id === Number(receipt.contaId));
    if (!account) return;
    if (receipt.comprovante && !isSupportedReceiptFile(receipt.comprovante)) {
      const message = 'Selecione um comprovante bancário no formato PDF ou JPG.';
      setError(message);
      setReceiptToast({ type: 'error', message });
      return;
    }
    let createdReceipt:
      | {
          id: number;
          dataRecebimento: string;
          valorRecebido: number;
          formaRecebimento: string;
          referenciaBancaria?: string | null;
        }
      | undefined;
    const completed = await run(
      async () => {
        const updated = await registerReceipt(
          account.id,
          {
            contaReceberId: account.id,
            dataRecebimento: new Date().toISOString(),
            valorRecebido: Number(receipt.valor.replace(',', '.')),
            formaRecebimento: receipt.forma,
            referenciaBancaria: receipt.referencia || null,
            documentoComprovante: null,
            observacao: null,
            usuarioCadastroId: 0,
            rowVersion: account.rowVersion,
          },
          session.token,
        );
        createdReceipt = updated.recebimentos.find(
          (item) => !account.recebimentos.some((old) => old.id === item.id),
        );
        if (receipt.comprovante && createdReceipt) {
          await uploadReceipt(createdReceipt.id, receipt.comprovante, session.token);
        }
      },
      receipt.comprovante
        ? 'Recebimento e comprovante registrados.'
        : 'Recebimento registrado e saldo recalculado.',
      {
        onSuccess: (message) => setReceiptToast({ type: 'success', message }),
        onError: (message) => setReceiptToast({ type: 'error', message }),
      },
    );
    if (!completed || !createdReceipt) return;

    try {
      await downloadGeneratedReceipt(
        {
          receiptId: createdReceipt.id,
          documentNumber: account.numeroDocumento,
          patient: account.paciente,
          paymentDate: createdReceipt.dataRecebimento,
          amount: createdReceipt.valorRecebido,
          paymentMethod: createdReceipt.formaRecebimento,
          bankReference: createdReceipt.referenciaBancaria,
          registeredBy: session.user.nome,
        },
        receipt.comprovanteFormato,
      );
      setReceipt({
        contaId: '',
        valor: '',
        forma: 'Pix',
        referencia: '',
        comprovanteFormato: receipt.comprovanteFormato,
        comprovante: null,
      });
      setReceiptToast({
        type: 'success',
        message: `Recebimento registrado e comprovante ${receipt.comprovanteFormato.toUpperCase()} gerado.`,
      });
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : 'Recebimento registrado, mas não foi possível gerar o comprovante.';
      setReceiptToast({ type: 'error', message });
    }
  };

  const handleReceiptFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file && !isSupportedReceiptFile(file)) {
      const message = 'Selecione um comprovante bancário no formato PDF ou JPG.';
      setError(message);
      setReceiptToast({ type: 'error', message });
      event.target.value = '';
      setReceipt((current) => ({ ...current, comprovante: null }));
      return;
    }
    setError('');
    setReceipt((current) => ({ ...current, comprovante: file }));
  };

  const applyFilters = async (page = 1) => {
    setError('');
    try {
      const [paged, resumo] = await filtersOperation.execute(page);
      setContas(paged.items);
      setFinancePage({
        page: paged.page,
        totalPages: paged.totalPages,
        totalItems: paged.totalItems,
      });
      setFinanceiroResumo(resumo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível filtrar o financeiro.');
    }
  };

  const downloadReceipt = async (id: number) => {
    try {
      const blob = await downloadReceiptFile(id, session.token);
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

  const saveAccount = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAccount || !accountDraft) return;
    void run(
      () =>
        saveReceivable(
          selectedAccount.id,
          {
            id: selectedAccount.id,
            ...accountDraft,
            valorOriginal: Number(accountDraft.valorOriginal),
            valorAjustado: Number(accountDraft.valorAjustado),
            observacao: accountDraft.observacao || null,
            rowVersion: selectedAccount.rowVersion,
          },
          session.token,
        ),
      'Título atualizado.',
    ).then(() => {
      setAccountDraft(null);
      setSelectedAccount(null);
    });
  };

  const cancelAccount = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAccount) return;
    void run(
      () =>
        cancelReceivable(
          selectedAccount.id,
          {
            id: selectedAccount.id,
            motivo: cancelReason,
            rowVersion: selectedAccount.rowVersion,
          },
          session.token,
        ),
      'Título cancelado com histórico preservado.',
    ).then(() => {
      setSelectedAccount(null);
      setCancelReason('');
    });
  };

  return {
    isLoading: filtersOperation.isLoading,
    submitReversal,
    submitReceipt,
    handleReceiptFileChange,
    applyFilters,
    downloadReceipt,
    saveAccount,
    cancelAccount,
  };
}
