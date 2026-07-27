import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  AlertMessage,
  Button,
  DataPanel,
} from "../../shared/components/ui";
import { ConfirmationDialog } from "../../shared/components/ConfirmationDialog";
import type {
  AuthSession,
  Convenio,
  MedicalUserOption,
  OpmeFornecedor,
} from "../../types";
import { BillingCbhpmLookupModal } from "./BillingCbhpmLookupModal";
import { AttendanceSection } from "./AttendanceSection";
import { InvoicingSection } from "./InvoicingSection";
import { FinanceSection } from "./FinanceSection";
import { PricesSection } from "./PricesSection";
import {
  BillingAppealModal,
  BillingReturnModal,
  BillingReversalModal,
} from "./BillingWorkflowModals";
import { AttendanceDetailsModal } from "./AttendanceDetailsModal";
import { GlosaEditModal, RecursoEditModal } from "./BillingEditModals";
import {
  AccountDetailsModal,
  InvoicingDetailsModal,
} from "./BillingDetailsModals";
import { useAttendances } from "./useAttendances";
import { useInvoicing } from "./useInvoicing";
import { useReceivables } from "./useReceivables";
import { useProcedurePrices } from "./useProcedurePrices";
import { useAttendanceWorkflow } from "./useAttendanceWorkflow";
import { useInvoicingWorkflow } from "./useInvoicingWorkflow";
import { useReceivablesWorkflow } from "./useReceivablesWorkflow";
import { usePriceWorkflow } from "./usePriceWorkflow";
import type {
  BillingTab,
  ConfirmAction,
  RunBillingAction,
} from "./billingWorkflowTypes";
import "./billing.css";

type BillingPageProps = {
  session: AuthSession;
  medicalUsers: MedicalUserOption[];
  convenios: Convenio[];
  opmeFornecedores: OpmeFornecedor[];
  isAdmin: boolean;
  isMedical: boolean;
  section?: BillingTab;
};

export function BillingPage({
  session,
  medicalUsers,
  convenios,
  opmeFornecedores,
  isMedical,
  section = "atendimentos",
}: BillingPageProps) {
  const tab = section;
  const attendance = useAttendances(
    isMedical ? String(session.user.id) : "",
  );
  const {
    atendimentos,
    setAtendimentos,
    pacientes,
    setPacientes,
    hospitais,
    showForm,
    setShowForm,
    editingAttendanceId,
    atendimentoForm,
    setAtendimentoForm,
    procedimentos,
    setProcedimentos,
    selectedAttendance,
    setSelectedAttendance,
    cbhpmModalOpen,
    setCbhpmModalOpen,
    loadAttendances,
  } = attendance;
  const invoicing = useInvoicing();
  const {
    faturamentos,
    editingBillingId,
    faturamentoForm,
    setFaturamentoForm,
    returnTarget,
    setReturnTarget,
    returnDraft,
    setReturnDraft,
    appealTarget,
    appealDraft,
    setAppealDraft,
    selectedBilling,
    setSelectedBilling,
    billingItemDraft,
    setBillingItemDraft,
    glosaDraft,
    setGlosaDraft,
    recursoDraft,
    setRecursoDraft,
    loadInvoicing,
    removeInvoice,
    removeGlosa,
    removeAppeal,
  } = invoicing;
  const receivables = useReceivables();
  const {
    contas,
    receiptToast,
    setReceiptToast,
    receipt,
    setReceipt,
    reversalTarget,
    setReversalTarget,
    reversalReason,
    setReversalReason,
    financeiroResumo,
    financePage,
    financeFilters,
    setFinanceFilters,
    selectedAccount,
    setSelectedAccount,
    accountDraft,
    setAccountDraft,
    cancelReason,
    setCancelReason,
    openBalance,
    received,
    loadReceivables,
  } = receivables;
  const prices = useProcedurePrices();
  const {
    precos,
    price,
    setPrice,
    editingPriceId,
    loadProcedurePrices,
  } = prices;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    section: BillingTab;
    message: string;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const canManageBilling = !isMedical;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      if (tab === "atendimentos") {
        await loadAttendances(session.token);
      } else if (tab === "faturamento") {
        setAtendimentos(await loadInvoicing(session.token));
      } else if (tab === "financeiro" && canManageBilling) {
        setPacientes(await loadReceivables(session.token));
      } else if (tab === "precos") {
        await loadProcedurePrices(session.token);
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar o módulo.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [session.token, tab]);

  useEffect(() => {
    setError("");
    setSuccess(null);
    setReceiptToast(null);
  }, [tab]);

  useEffect(() => {
    if (!success) return;

    const timeoutId = window.setTimeout(() => setSuccess(null), 10000);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  useEffect(() => {
    if (!error) return;

    const timeoutId = window.setTimeout(() => setError(""), 10000);
    return () => window.clearTimeout(timeoutId);
  }, [error]);

  useEffect(() => {
    if (!receiptToast) return;

    const timeoutId = window.setTimeout(() => setReceiptToast(null), 10000);
    return () => window.clearTimeout(timeoutId);
  }, [receiptToast]);

  const run: RunBillingAction = async (action, message, feedback) => {
    const actionSection = tab;
    setLoading(true);
    setError("");
    setSuccess(null);
    try {
      await action();
      setSuccess({ section: actionSection, message });
      feedback?.onSuccess?.(message);
      setShowForm(false);
      await load();
      return true;
    } catch (reason) {
      const errorMessage =
        reason instanceof Error ? reason.message : "Operação não concluída.";
      setError(errorMessage);
      feedback?.onError?.(errorMessage);
      setLoading(false);
      return false;
    }
  };

  const attendanceWorkflow = useAttendanceWorkflow({
    session,
    isMedical,
    convenios,
    opmeFornecedores,
    attendance,
    run,
    setError,
    setConfirmAction,
  });
  const invoicingWorkflow = useInvoicingWorkflow({
    session,
    invoicing,
    run,
    setConfirmAction,
    setShowForm,
  });
  const receivablesWorkflow = useReceivablesWorkflow({
    session,
    receivables,
    run,
    setLoading,
    setError,
  });
  const priceWorkflow = usePriceWorkflow({
    session,
    prices,
    run,
    setConfirmAction,
  });

  return (
    <section className="workspace billing-workspace">
      <DataPanel className="billing-filter-panel">
        <div className="billing-section-heading">
          <div>
            <span className="eyebrow">Módulo</span>
            <h2>
              {tab === "atendimentos"
                ? "Atendimentos cirúrgicos"
                : tab === "faturamento"
                  ? "Faturamento"
                  : tab === "financeiro"
                    ? "Financeiro"
                    : "Tabela de preços"}
            </h2>
          </div>
          <Button onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} /> Atualizar
          </Button>
        </div>
      </DataPanel>
      {error && <AlertMessage type="error">{error}</AlertMessage>}
      {success?.section === tab && (
        <AlertMessage type="success">{success.message}</AlertMessage>
      )}

      {tab === "atendimentos" && (
        <AttendanceSection
          editingId={editingAttendanceId}
          showForm={showForm}
          form={atendimentoForm}
          procedimentos={procedimentos}
          pacientes={pacientes}
          hospitais={hospitais}
          convenios={convenios}
          opmeFornecedores={opmeFornecedores}
          medicalUsers={medicalUsers}
          isMedical={isMedical}
          loading={loading}
          atendimentos={atendimentos}
          setForm={setAtendimentoForm}
          setProcedimentos={setProcedimentos}
          onToggleForm={() => setShowForm((current) => !current)}
          onOpenCbhpm={() => setCbhpmModalOpen(true)}
          onSubmit={attendanceWorkflow.submit}
          onCancelEditing={attendanceWorkflow.resetForm}
          onSelect={setSelectedAttendance}
          onEdit={attendanceWorkflow.edit}
          onDelete={attendanceWorkflow.confirmDelete}
        />
      )}


      {tab === "faturamento" && (
        <InvoicingSection
          canManage={canManageBilling}
          editingId={editingBillingId}
          showForm={showForm}
          loading={loading}
          form={faturamentoForm}
          atendimentos={atendimentos}
          faturamentos={faturamentos}
          setForm={setFaturamentoForm}
          onToggleForm={() => setShowForm((current) => !current)}
          onSubmit={invoicingWorkflow.submit}
          onCancelEditing={invoicingWorkflow.resetForm}
          onSelect={setSelectedBilling}
          onEdit={invoicingWorkflow.edit}
          onDelete={invoicingWorkflow.confirmDelete}
          onPrepare={(item) =>
            invoicingWorkflow.changeStatus(item, "ProntoParaEnvio")
          }
          onSend={(item) => invoicingWorkflow.changeStatus(item, "Enviado")}
          onOpenReturn={invoicingWorkflow.openReturn}
          onCreateAccount={invoicingWorkflow.createAccount}
          onOpenAppeal={invoicingWorkflow.openAppeal}
        />
      )}

      {tab === "financeiro" && canManageBilling && (
        <FinanceSection
          resumo={financeiroResumo}
          received={received}
          openBalance={openBalance}
          filters={financeFilters}
          receipt={receipt}
          receiptToast={receiptToast}
          contas={contas}
          convenios={convenios}
          medicalUsers={medicalUsers}
          pacientes={pacientes}
          page={financePage}
          loading={loading}
          setFilters={setFinanceFilters}
          setReceipt={setReceipt}
          onApplyFilters={(page) =>
            void receivablesWorkflow.applyFilters(page)
          }
          onSubmitReceipt={receivablesWorkflow.submitReceipt}
          onReceiptFileChange={receivablesWorkflow.handleReceiptFileChange}
          onSelectAccount={setSelectedAccount}
          onOpenReversal={(id, valor) => setReversalTarget({ id, valor })}
        />
      )}

      {tab === "precos" && (
        <PricesSection
          canManage={canManageBilling}
          editingId={editingPriceId}
          loading={loading}
          form={price}
          convenios={convenios}
          precos={precos}
          setForm={setPrice}
          onSubmit={priceWorkflow.submit}
          onCancelEditing={priceWorkflow.resetForm}
          onEdit={priceWorkflow.edit}
          onDeactivate={priceWorkflow.confirmDeactivate}
        />
      )}

      {returnTarget && (
        <BillingReturnModal
          draft={returnDraft}
          loading={loading}
          setDraft={setReturnDraft}
          onClose={() => setReturnTarget(null)}
          onSubmit={invoicingWorkflow.submitReturn}
        />
      )}
      {appealTarget && (
        <BillingAppealModal
          valorGlosado={appealTarget.valorGlosado}
          draft={appealDraft}
          loading={loading}
          setDraft={setAppealDraft}
          onClose={invoicingWorkflow.closeAppeal}
          onSubmit={invoicingWorkflow.submitAppeal}
        />
      )}
      {reversalTarget && (
        <BillingReversalModal
          valor={reversalTarget.valor}
          reason={reversalReason}
          loading={loading}
          onReasonChange={setReversalReason}
          onClose={() => {
            setReversalTarget(null);
            setReversalReason("");
          }}
          onSubmit={receivablesWorkflow.submitReversal}
        />
      )}

      {selectedAccount && (
        <AccountDetailsModal
          selectedAccount={selectedAccount}
          accountDraft={accountDraft}
          setAccountDraft={setAccountDraft}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          setSelectedAccount={setSelectedAccount}
          saveAccount={receivablesWorkflow.saveAccount}
          cancelAccount={receivablesWorkflow.cancelAccount}
          downloadReceipt={receivablesWorkflow.downloadReceipt}
        />
      )}
      {selectedBilling && (
        <InvoicingDetailsModal
          selectedBilling={selectedBilling}
          setSelectedBilling={setSelectedBilling}
          billingItemDraft={billingItemDraft}
          setBillingItemDraft={setBillingItemDraft}
          setGlosaDraft={setGlosaDraft}
          setRecursoDraft={setRecursoDraft}
          setConfirmAction={setConfirmAction}
          saveBillingItem={invoicingWorkflow.saveBillingItem}
          session={session}
          canManageBilling={canManageBilling}
          editBilling={invoicingWorkflow.edit}
          deleteFaturamento={removeInvoice}
          deleteGlosa={removeGlosa}
          deleteRecursoGlosa={removeAppeal}
        />
      )}

      {glosaDraft && (
        <GlosaEditModal
          draft={glosaDraft}
          setDraft={setGlosaDraft}
          onClose={() => setGlosaDraft(null)}
          onSubmit={invoicingWorkflow.saveGlosa}
        />
      )}
      {recursoDraft && (
        <RecursoEditModal
          draft={recursoDraft}
          setDraft={setRecursoDraft}
          onClose={() => setRecursoDraft(null)}
          onSubmit={invoicingWorkflow.saveRecurso}
        />
      )}

      {confirmAction && (
        <ConfirmationDialog
          tone="delete"
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel="Confirmar"
          cancelLabel="Cancelar"
          loading={loading}
          onCancel={() => setConfirmAction(null)}
          onConfirm={async () => {
            const pending = confirmAction;
            const completed = await run(pending.action, pending.success);
            if (completed) {
              pending.after?.();
              setConfirmAction(null);
            }
          }}
        />
      )}
      {selectedAttendance && (
        <AttendanceDetailsModal
          item={selectedAttendance}
          onEdit={() => attendanceWorkflow.edit(selectedAttendance)}
          onDelete={() =>
            attendanceWorkflow.confirmDelete(selectedAttendance, true)
          }
          onClose={() => setSelectedAttendance(null)}
        />
      )}

      {cbhpmModalOpen && (
        <BillingCbhpmLookupModal
          token={session.token}
          onClose={() => setCbhpmModalOpen(false)}
          onSelect={attendanceWorkflow.selectCbhpm}
        />
      )}
    </section>
  );
}
