import type { FormEvent } from 'react';
import type { Faturamento } from '../billingDomainTypes';
import { createInitialFaturamentoForm } from './useInvoicing';
import type { InvoicingWorkflowOptions } from './invoicingWorkflowActionTypes';

export function createInvoicingCrudActions({
  session,
  invoicing,
  run,
  setConfirmAction,
  setShowForm,
}: InvoicingWorkflowOptions) {
  const resetForm = () => {
    invoicing.setEditingBillingId(null);
    invoicing.setFaturamentoForm(createInitialFaturamentoForm());
    setShowForm(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const editingBilling = invoicing.faturamentos.find(
      (item) => item.id === invoicing.editingBillingId,
    );
    void run(
      async () => {
        const saved = await invoicing.saveInvoice(
          invoicing.editingBillingId && editingBilling ? invoicing.editingBillingId : null,
          {
            atendimentoCirurgicoId: Number(invoicing.faturamentoForm.atendimentoCirurgicoId),
            numeroGuia: invoicing.faturamentoForm.numeroGuia || null,
            numeroLote: invoicing.faturamentoForm.numeroLote || null,
            competencia: `${invoicing.faturamentoForm.competencia}-01`,
            observacao: invoicing.faturamentoForm.observacao || null,
            rowVersion: editingBilling?.rowVersion,
          },
          session.token,
        );
        invoicing.setFaturamentoForm(createInitialFaturamentoForm());
        invoicing.setEditingBillingId(null);
        return saved;
      },
      invoicing.editingBillingId
        ? 'Faturamento atualizado.'
        : 'Faturamento criado a partir do atendimento.',
    );
  };

  const edit = (item: Faturamento) => {
    invoicing.setEditingBillingId(item.id);
    invoicing.setFaturamentoForm({
      atendimentoCirurgicoId: String(item.atendimentoCirurgicoId),
      competencia: item.competencia.slice(0, 7),
      numeroGuia: item.numeroGuia ?? '',
      numeroLote: item.numeroLote ?? '',
      observacao: item.observacao ?? '',
    });
    invoicing.setSelectedBilling(null);
    setShowForm(true);
  };

  const confirmDelete = (item: Faturamento) => {
    setConfirmAction({
      title: 'Excluir faturamento',
      message: `Excluir o faturamento de ${item.paciente}? Os itens em rascunho também serão removidos.`,
      action: () => invoicing.removeInvoice(item.id, session.token),
      success: 'Faturamento excluído.',
    });
  };

  const changeStatus = (item: Faturamento, status: 'ProntoParaEnvio' | 'Enviado') =>
    void run(
      () =>
        invoicing.changeInvoiceStatus(
          item.id,
          { id: item.id, status, rowVersion: item.rowVersion },
          session.token,
        ),
      status === 'ProntoParaEnvio'
        ? 'Faturamento pronto para envio.'
        : 'Faturamento enviado e data de envio registrada.',
    );

  const createAccount = (item: Faturamento) =>
    void run(
      () =>
        invoicing.createReceivable(
          item.id,
          {
            faturamentoId: item.id,
            numeroDocumento: `FAT-${item.id}-01`,
            descricao: `Faturamento ${item.numeroGuia || item.id}`,
            dataEmissao: new Date().toISOString(),
            dataVencimento: new Date(Date.now() + 30 * 86400000).toISOString(),
            valorOriginal: null,
            valorAjustado: null,
            observacao: null,
          },
          session.token,
        ),
      'Conta a receber gerada sem duplicidade.',
    );

  return { resetForm, submit, edit, confirmDelete, changeStatus, createAccount };
}
