import type { ChangeEvent, FormEvent } from 'react';
import { downloadGeneratedReceipt } from '../receiptDocument';
import { isSupportedReceiptFile } from '../receiptFileValidation';
import type { ReceivablesWorkflowOptions } from './receivablesWorkflowActionTypes';

export function createReceivableMutationActions({
  session,
  receivables,
  run,
  setError,
}: ReceivablesWorkflowOptions) {
  const submitReversal = (event: FormEvent) => {
    event.preventDefault();
    if (!receivables.reversalTarget) return;
    void run(
      () =>
        receivables.reverseReceipt(
          receivables.reversalTarget!.id,
          receivables.reversalReason,
          session.token,
        ),
      'Recebimento estornado e saldo recalculado.',
    ).then(() => {
      receivables.setReversalTarget(null);
      receivables.setReversalReason('');
    });
  };

  const submitReceipt = async (event: FormEvent) => {
    event.preventDefault();
    receivables.setReceiptToast(null);
    const account = receivables.contas.find(
      (item) => item.id === Number(receivables.receipt.contaId),
    );
    if (!account) return;
    if (
      receivables.receipt.comprovante &&
      !isSupportedReceiptFile(receivables.receipt.comprovante)
    ) {
      const message = 'Selecione um comprovante bancário no formato PDF ou JPG.';
      setError(message);
      receivables.setReceiptToast({ type: 'error', message });
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
        const updated = await receivables.registerReceipt(
          account.id,
          {
            contaReceberId: account.id,
            dataRecebimento: new Date().toISOString(),
            valorRecebido: Number(receivables.receipt.valor.replace(',', '.')),
            formaRecebimento: receivables.receipt.forma,
            referenciaBancaria: receivables.receipt.referencia || null,
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
        if (receivables.receipt.comprovante && createdReceipt) {
          await receivables.uploadReceipt(
            createdReceipt.id,
            receivables.receipt.comprovante,
            session.token,
          );
        }
      },
      receivables.receipt.comprovante
        ? 'Recebimento e comprovante registrados.'
        : 'Recebimento registrado e saldo recalculado.',
      {
        onSuccess: (message) => receivables.setReceiptToast({ type: 'success', message }),
        onError: (message) => receivables.setReceiptToast({ type: 'error', message }),
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
        receivables.receipt.comprovanteFormato,
      );
      receivables.setReceipt({
        contaId: '',
        valor: '',
        forma: 'Pix',
        referencia: '',
        comprovanteFormato: receivables.receipt.comprovanteFormato,
        comprovante: null,
      });
      receivables.setReceiptToast({
        type: 'success',
        message: `Recebimento registrado e comprovante ${receivables.receipt.comprovanteFormato.toUpperCase()} gerado.`,
      });
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : 'Recebimento registrado, mas não foi possível gerar o comprovante.';
      receivables.setReceiptToast({ type: 'error', message });
    }
  };

  const handleReceiptFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file && !isSupportedReceiptFile(file)) {
      const message = 'Selecione um comprovante bancário no formato PDF ou JPG.';
      setError(message);
      receivables.setReceiptToast({ type: 'error', message });
      event.target.value = '';
      receivables.setReceipt((current) => ({ ...current, comprovante: null }));
      return;
    }
    setError('');
    receivables.setReceipt((current) => ({ ...current, comprovante: file }));
  };

  const saveAccount = (event: FormEvent) => {
    event.preventDefault();
    if (!receivables.selectedAccount || !receivables.accountDraft) return;
    const selected = receivables.selectedAccount;
    const draft = receivables.accountDraft;
    void run(
      () =>
        receivables.saveReceivable(
          selected.id,
          {
            id: selected.id,
            ...draft,
            valorOriginal: Number(draft.valorOriginal),
            valorAjustado: Number(draft.valorAjustado),
            observacao: draft.observacao || null,
            rowVersion: selected.rowVersion,
          },
          session.token,
        ),
      'Título atualizado.',
    ).then(() => {
      receivables.setAccountDraft(null);
      receivables.setSelectedAccount(null);
    });
  };

  const cancelAccount = (event: FormEvent) => {
    event.preventDefault();
    if (!receivables.selectedAccount) return;
    const selected = receivables.selectedAccount;
    void run(
      () =>
        receivables.cancelReceivable(
          selected.id,
          {
            id: selected.id,
            motivo: receivables.cancelReason,
            rowVersion: selected.rowVersion,
          },
          session.token,
        ),
      'Título cancelado com histórico preservado.',
    ).then(() => {
      receivables.setSelectedAccount(null);
      receivables.setCancelReason('');
    });
  };

  return {
    submitReversal,
    submitReceipt,
    handleReceiptFileChange,
    saveAccount,
    cancelAccount,
  };
}
