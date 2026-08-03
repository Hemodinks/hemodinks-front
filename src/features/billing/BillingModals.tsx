import type { Dispatch, SetStateAction } from 'react';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import { ConfirmationDialog } from '../../shared/components/ConfirmationDialog';
import { AccountDetailsModal, InvoicingDetailsModal } from './BillingDetailsModals';
import { GlosaEditModal, RecursoEditModal } from './BillingEditModals';
import {
  BillingAppealModal,
  BillingReturnModal,
  BillingReversalModal,
} from './BillingWorkflowModals';
import { AttendanceDetailsModal } from './AttendanceDetailsModal';
import { BillingCbhpmLookupModal } from './BillingCbhpmLookupModal';
import type { ConfirmAction, RunBillingAction } from './billingWorkflowTypes';
import type { useAttendanceWorkflow } from './useAttendanceWorkflow';
import type { useAttendances } from './attendance/useAttendances';
import type { useInvoicing } from './invoicing/useInvoicing';
import type { useInvoicingWorkflow } from './invoicing/useInvoicingWorkflow';
import type { useReceivables } from './receivables/useReceivables';
import type { useReceivablesWorkflow } from './receivables/useReceivablesWorkflow';

type BillingModalsProps = {
  session: AuthSession;
  loading: boolean;
  canManageBilling: boolean;
  attendance: ReturnType<typeof useAttendances>;
  invoicing: ReturnType<typeof useInvoicing>;
  receivables: ReturnType<typeof useReceivables>;
  attendanceWorkflow: ReturnType<typeof useAttendanceWorkflow>;
  invoicingWorkflow: ReturnType<typeof useInvoicingWorkflow>;
  receivablesWorkflow: ReturnType<typeof useReceivablesWorkflow>;
  confirmAction: ConfirmAction;
  setConfirmAction: Dispatch<SetStateAction<ConfirmAction>>;
  run: RunBillingAction;
};

export function BillingModals({
  session,
  loading,
  canManageBilling,
  attendance,
  invoicing,
  receivables,
  attendanceWorkflow,
  invoicingWorkflow,
  receivablesWorkflow,
  confirmAction,
  setConfirmAction,
  run,
}: BillingModalsProps) {
  return (
    <>
      {invoicing.returnTarget && (
        <BillingReturnModal
          draft={invoicing.returnDraft}
          loading={loading}
          setDraft={invoicing.setReturnDraft}
          onClose={() => invoicing.setReturnTarget(null)}
          onSubmit={invoicingWorkflow.submitReturn}
        />
      )}
      {invoicing.appealTarget && (
        <BillingAppealModal
          valorGlosado={invoicing.appealTarget.valorGlosado}
          draft={invoicing.appealDraft}
          loading={loading}
          setDraft={invoicing.setAppealDraft}
          onClose={invoicingWorkflow.closeAppeal}
          onSubmit={invoicingWorkflow.submitAppeal}
        />
      )}
      {receivables.reversalTarget && (
        <BillingReversalModal
          valor={receivables.reversalTarget.valor}
          reason={receivables.reversalReason}
          loading={loading}
          onReasonChange={receivables.setReversalReason}
          onClose={() => {
            receivables.setReversalTarget(null);
            receivables.setReversalReason('');
          }}
          onSubmit={receivablesWorkflow.submitReversal}
        />
      )}

      {receivables.selectedAccount && (
        <AccountDetailsModal
          selectedAccount={receivables.selectedAccount}
          accountDraft={receivables.accountDraft}
          setAccountDraft={receivables.setAccountDraft}
          cancelReason={receivables.cancelReason}
          setCancelReason={receivables.setCancelReason}
          setSelectedAccount={receivables.setSelectedAccount}
          saveAccount={receivablesWorkflow.saveAccount}
          cancelAccount={receivablesWorkflow.cancelAccount}
          downloadReceipt={receivablesWorkflow.downloadReceipt}
        />
      )}
      {invoicing.selectedBilling && (
        <InvoicingDetailsModal
          selectedBilling={invoicing.selectedBilling}
          setSelectedBilling={invoicing.setSelectedBilling}
          billingItemDraft={invoicing.billingItemDraft}
          setBillingItemDraft={invoicing.setBillingItemDraft}
          setGlosaDraft={invoicing.setGlosaDraft}
          setRecursoDraft={invoicing.setRecursoDraft}
          setConfirmAction={setConfirmAction}
          saveBillingItem={invoicingWorkflow.saveBillingItem}
          session={session}
          canManageBilling={canManageBilling}
          editBilling={invoicingWorkflow.edit}
          deleteFaturamento={invoicing.removeInvoice}
          deleteGlosa={invoicing.removeGlosa}
          deleteRecursoGlosa={invoicing.removeAppeal}
        />
      )}

      {invoicing.glosaDraft && (
        <GlosaEditModal
          draft={invoicing.glosaDraft}
          setDraft={invoicing.setGlosaDraft}
          onClose={() => invoicing.setGlosaDraft(null)}
          onSubmit={invoicingWorkflow.saveGlosa}
        />
      )}
      {invoicing.recursoDraft && (
        <RecursoEditModal
          draft={invoicing.recursoDraft}
          setDraft={invoicing.setRecursoDraft}
          onClose={() => invoicing.setRecursoDraft(null)}
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
      {attendance.selectedAttendance && (
        <AttendanceDetailsModal
          item={attendance.selectedAttendance}
          onEdit={() => attendanceWorkflow.edit(attendance.selectedAttendance!)}
          onDelete={() => attendanceWorkflow.confirmDelete(attendance.selectedAttendance!, true)}
          onClose={() => attendance.setSelectedAttendance(null)}
        />
      )}

      {attendance.cbhpmModalOpen && (
        <BillingCbhpmLookupModal
          token={session.token}
          onClose={() => attendance.setCbhpmModalOpen(false)}
          onSelect={attendanceWorkflow.selectCbhpm}
        />
      )}
    </>
  );
}
