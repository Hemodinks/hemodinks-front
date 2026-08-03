import type { FormEvent } from 'react';
import type { Faturamento } from '../billingDomainTypes';
import type { InvoicingWorkflowOptions } from './invoicingWorkflowActionTypes';

export function createInvoicingReconciliationActions({
  session,
  invoicing,
  run,
}: InvoicingWorkflowOptions) {
  const openReturn = (item: Faturamento) => {
    invoicing.setReturnTarget(item);
    invoicing.setReturnDraft(
      item.itens.map((billingItem) => ({
        faturamentoItemId: billingItem.id,
        descricao: billingItem.descricao,
        valorApresentado: billingItem.valorApresentado,
        valorGlosado: '0',
        motivoGlosa: '',
      })),
    );
  };

  const submitReturn = (event: FormEvent) => {
    event.preventDefault();
    if (!invoicing.returnTarget) return;
    const target = invoicing.returnTarget;
    const inputs = invoicing.returnDraft.map((input) => {
      const valorGlosado = Number(input.valorGlosado.replace(',', '.'));
      return {
        faturamentoItemId: input.faturamentoItemId,
        valorGlosado,
        valorAprovado: input.valorApresentado - valorGlosado,
        codigoMotivo: null,
        motivoGlosa: valorGlosado > 0 ? input.motivoGlosa : null,
      };
    });
    void run(
      () =>
        invoicing.registerReturn(
          target.id,
          {
            id: target.id,
            dataRetorno: new Date().toISOString(),
            itens: inputs,
            rowVersion: target.rowVersion,
          },
          session.token,
        ),
      'Retorno registrado e títulos reconciliados.',
    ).then(() => invoicing.setReturnTarget(null));
  };

  const closeAppeal = () => {
    invoicing.setAppealTarget(null);
    invoicing.setAppealDraft({ justificativa: '', valorRecuperado: '0' });
  };

  const openAppeal = (glosaId: number, valorGlosado: number) => {
    invoicing.setAppealTarget({ glosaId, valorGlosado });
    invoicing.setAppealDraft({ justificativa: '', valorRecuperado: '0' });
  };

  const submitAppeal = async (event: FormEvent) => {
    event.preventDefault();
    if (!invoicing.appealTarget) return;
    const target = invoicing.appealTarget;
    const valorRecuperado = Number(invoicing.appealDraft.valorRecuperado.replace(',', '.'));
    const completed = await run(
      () =>
        invoicing.registerAppeal(
          target.glosaId,
          {
            glosaId: target.glosaId,
            dataEnvio: new Date().toISOString(),
            justificativa: invoicing.appealDraft.justificativa,
            valorRecorrido: target.valorGlosado,
            dataResposta: valorRecuperado > 0 ? new Date().toISOString() : null,
            valorRecuperado,
            status:
              valorRecuperado > 0
                ? valorRecuperado === target.valorGlosado
                  ? 'Aceito'
                  : 'AceitoParcialmente'
                : 'Enviado',
            observacao: null,
          },
          session.token,
        ),
      'Recurso de glosa registrado.',
    );
    if (completed) closeAppeal();
  };

  const saveGlosa = (event: FormEvent) => {
    event.preventDefault();
    if (!invoicing.glosaDraft) return;
    const draft = invoicing.glosaDraft;
    void run(
      () =>
        invoicing.saveGlosaRecord(
          draft.id,
          {
            id: draft.id,
            codigoMotivo: draft.codigoMotivo || null,
            descricaoMotivo: draft.descricaoMotivo,
            valorGlosado: Number(draft.valorGlosado),
            dataGlosa: draft.dataGlosa,
            observacao: draft.observacao || null,
          },
          session.token,
        ),
      'Glosa atualizada e totais recalculados.',
    ).then(() => {
      invoicing.setGlosaDraft(null);
      invoicing.setSelectedBilling(null);
    });
  };

  const saveRecurso = (event: FormEvent) => {
    event.preventDefault();
    if (!invoicing.recursoDraft) return;
    const draft = invoicing.recursoDraft;
    void run(
      () =>
        invoicing.saveAppealRecord(
          draft.id,
          {
            id: draft.id,
            dataEnvio: draft.dataEnvio || null,
            justificativa: draft.justificativa,
            valorRecorrido: Number(draft.valorRecorrido),
            dataResposta: draft.dataResposta || null,
            valorRecuperado: Number(draft.valorRecuperado),
            status: draft.status,
            observacao: draft.observacao || null,
          },
          session.token,
        ),
      'Recurso atualizado e totais recalculados.',
    ).then(() => {
      invoicing.setRecursoDraft(null);
      invoicing.setSelectedBilling(null);
    });
  };

  const saveBillingItem = (event: FormEvent) => {
    event.preventDefault();
    if (!invoicing.selectedBilling || !invoicing.billingItemDraft) return;
    const selected = invoicing.selectedBilling;
    const draft = invoicing.billingItemDraft;
    void run(
      () =>
        invoicing.saveInvoiceItem(
          selected.id,
          draft.itemId,
          {
            faturamentoId: selected.id,
            itemId: draft.itemId,
            codigo: draft.codigo || null,
            descricao: draft.descricao,
            quantidade: Number(draft.quantidade),
            pesoPercentual: Number(draft.pesoPercentual),
            valorUnitario: Number(draft.valorUnitario),
            rowVersion: selected.rowVersion,
          },
          session.token,
        ),
      'Item do rascunho atualizado.',
    ).then(() => {
      invoicing.setSelectedBilling(null);
      invoicing.setBillingItemDraft(null);
    });
  };

  return {
    openReturn,
    submitReturn,
    closeAppeal,
    openAppeal,
    submitAppeal,
    saveGlosa,
    saveRecurso,
    saveBillingItem,
  };
}
