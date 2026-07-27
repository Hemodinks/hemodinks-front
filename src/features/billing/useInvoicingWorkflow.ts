import type { FormEvent } from "react";
import type { AuthSession, Faturamento } from "../../types";
import type {
  RunBillingAction,
  SetConfirmAction,
} from "./billingWorkflowTypes";
import {
  createInitialFaturamentoForm,
  type useInvoicing,
} from "./useInvoicing";

type InvoicingState = ReturnType<typeof useInvoicing>;

type InvoicingWorkflowOptions = {
  session: AuthSession;
  invoicing: InvoicingState;
  run: RunBillingAction;
  setConfirmAction: SetConfirmAction;
  setShowForm: (value: boolean) => void;
};

export function useInvoicingWorkflow({
  session,
  invoicing,
  run,
  setConfirmAction,
  setShowForm,
}: InvoicingWorkflowOptions) {
  const {
    appealDraft,
    appealTarget,
    billingItemDraft,
    createReceivable,
    editingBillingId,
    faturamentoForm,
    faturamentos,
    glosaDraft,
    recursoDraft,
    registerAppeal,
    registerReturn,
    removeInvoice,
    returnDraft,
    returnTarget,
    saveAppealRecord,
    saveGlosaRecord,
    saveInvoice,
    saveInvoiceItem,
    selectedBilling,
    setAppealDraft,
    setAppealTarget,
    setBillingItemDraft,
    setEditingBillingId,
    setFaturamentoForm,
    setGlosaDraft,
    setRecursoDraft,
    setReturnDraft,
    setReturnTarget,
    setSelectedBilling,
    changeInvoiceStatus,
  } = invoicing;

  const resetForm = () => {
    setEditingBillingId(null);
    setFaturamentoForm(createInitialFaturamentoForm());
    setShowForm(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const editingBilling = faturamentos.find(
      (item) => item.id === editingBillingId,
    );
    void run(
      async () => {
        const payload = {
          atendimentoCirurgicoId: Number(
            faturamentoForm.atendimentoCirurgicoId,
          ),
          numeroGuia: faturamentoForm.numeroGuia || null,
          numeroLote: faturamentoForm.numeroLote || null,
          competencia: `${faturamentoForm.competencia}-01`,
          observacao: faturamentoForm.observacao || null,
          rowVersion: editingBilling?.rowVersion,
        };
        const saved = await saveInvoice(
          editingBillingId && editingBilling ? editingBillingId : null,
          payload,
          session.token,
        );
        setFaturamentoForm(createInitialFaturamentoForm());
        setEditingBillingId(null);
        return saved;
      },
      editingBillingId
        ? "Faturamento atualizado."
        : "Faturamento criado a partir do atendimento.",
    );
  };

  const edit = (item: Faturamento) => {
    setEditingBillingId(item.id);
    setFaturamentoForm({
      atendimentoCirurgicoId: String(item.atendimentoCirurgicoId),
      competencia: item.competencia.slice(0, 7),
      numeroGuia: item.numeroGuia ?? "",
      numeroLote: item.numeroLote ?? "",
      observacao: item.observacao ?? "",
    });
    setSelectedBilling(null);
    setShowForm(true);
  };

  const confirmDelete = (item: Faturamento) => {
    setConfirmAction({
      title: "Excluir faturamento",
      message: `Excluir o faturamento de ${item.paciente}? Os itens em rascunho também serão removidos.`,
      action: () => removeInvoice(item.id, session.token),
      success: "Faturamento excluído.",
    });
  };

  const changeStatus = (
    item: Faturamento,
    status: "ProntoParaEnvio" | "Enviado",
  ) =>
    void run(
      () =>
        changeInvoiceStatus(
          item.id,
          { id: item.id, status, rowVersion: item.rowVersion },
          session.token,
        ),
      status === "ProntoParaEnvio"
        ? "Faturamento pronto para envio."
        : "Faturamento enviado e data de envio registrada.",
    );

  const createAccount = (item: Faturamento) =>
    void run(
      () =>
        createReceivable(
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
      "Conta a receber gerada sem duplicidade.",
    );

  const openReturn = (item: Faturamento) => {
    setReturnTarget(item);
    setReturnDraft(
      item.itens.map((billingItem) => ({
        faturamentoItemId: billingItem.id,
        descricao: billingItem.descricao,
        valorApresentado: billingItem.valorApresentado,
        valorGlosado: "0",
        motivoGlosa: "",
      })),
    );
  };

  const submitReturn = (event: FormEvent) => {
    event.preventDefault();
    if (!returnTarget) return;
    const inputs = returnDraft.map((input) => {
      const valorGlosado = Number(input.valorGlosado.replace(",", "."));
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
        registerReturn(
          returnTarget.id,
          {
            id: returnTarget.id,
            dataRetorno: new Date().toISOString(),
            itens: inputs,
            rowVersion: returnTarget.rowVersion,
          },
          session.token,
        ),
      "Retorno registrado e títulos reconciliados.",
    ).then(() => setReturnTarget(null));
  };

  const closeAppeal = () => {
    setAppealTarget(null);
    setAppealDraft({ justificativa: "", valorRecuperado: "0" });
  };

  const openAppeal = (glosaId: number, valorGlosado: number) => {
    setAppealTarget({ glosaId, valorGlosado });
    setAppealDraft({ justificativa: "", valorRecuperado: "0" });
  };

  const submitAppeal = async (event: FormEvent) => {
    event.preventDefault();
    if (!appealTarget) return;
    const valorRecuperado = Number(
      appealDraft.valorRecuperado.replace(",", "."),
    );
    const completed = await run(
      () =>
        registerAppeal(
          appealTarget.glosaId,
          {
            glosaId: appealTarget.glosaId,
            dataEnvio: new Date().toISOString(),
            justificativa: appealDraft.justificativa,
            valorRecorrido: appealTarget.valorGlosado,
            dataResposta: valorRecuperado > 0 ? new Date().toISOString() : null,
            valorRecuperado,
            status:
              valorRecuperado > 0
                ? valorRecuperado === appealTarget.valorGlosado
                  ? "Aceito"
                  : "AceitoParcialmente"
                : "Enviado",
            observacao: null,
          },
          session.token,
        ),
      "Recurso de glosa registrado.",
    );
    if (completed) closeAppeal();
  };

  const saveGlosa = (event: FormEvent) => {
    event.preventDefault();
    if (!glosaDraft) return;
    void run(
      () =>
        saveGlosaRecord(
          glosaDraft.id,
          {
            id: glosaDraft.id,
            codigoMotivo: glosaDraft.codigoMotivo || null,
            descricaoMotivo: glosaDraft.descricaoMotivo,
            valorGlosado: Number(glosaDraft.valorGlosado),
            dataGlosa: glosaDraft.dataGlosa,
            observacao: glosaDraft.observacao || null,
          },
          session.token,
        ),
      "Glosa atualizada e totais recalculados.",
    ).then(() => {
      setGlosaDraft(null);
      setSelectedBilling(null);
    });
  };

  const saveRecurso = (event: FormEvent) => {
    event.preventDefault();
    if (!recursoDraft) return;
    void run(
      () =>
        saveAppealRecord(
          recursoDraft.id,
          {
            id: recursoDraft.id,
            dataEnvio: recursoDraft.dataEnvio || null,
            justificativa: recursoDraft.justificativa,
            valorRecorrido: Number(recursoDraft.valorRecorrido),
            dataResposta: recursoDraft.dataResposta || null,
            valorRecuperado: Number(recursoDraft.valorRecuperado),
            status: recursoDraft.status,
            observacao: recursoDraft.observacao || null,
          },
          session.token,
        ),
      "Recurso atualizado e totais recalculados.",
    ).then(() => {
      setRecursoDraft(null);
      setSelectedBilling(null);
    });
  };

  const saveBillingItem = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedBilling || !billingItemDraft) return;
    void run(
      () =>
        saveInvoiceItem(
          selectedBilling.id,
          billingItemDraft.itemId,
          {
            faturamentoId: selectedBilling.id,
            itemId: billingItemDraft.itemId,
            codigo: billingItemDraft.codigo || null,
            descricao: billingItemDraft.descricao,
            quantidade: Number(billingItemDraft.quantidade),
            pesoPercentual: Number(billingItemDraft.pesoPercentual),
            valorUnitario: Number(billingItemDraft.valorUnitario),
            rowVersion: selectedBilling.rowVersion,
          },
          session.token,
        ),
      "Item do rascunho atualizado.",
    ).then(() => {
      setSelectedBilling(null);
      setBillingItemDraft(null);
    });
  };

  return {
    resetForm,
    submit,
    edit,
    confirmDelete,
    changeStatus,
    createAccount,
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
