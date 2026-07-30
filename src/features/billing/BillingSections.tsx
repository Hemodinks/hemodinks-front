import type {
  Convenio,
  MedicalUserOption,
  OpmeFornecedor,
} from '../../shared/domain/clinicalContracts';
import { AttendanceSection } from './AttendanceSection';
import { FinanceSection } from './FinanceSection';
import { InvoicingSection } from './InvoicingSection';
import { PricesSection } from './PricesSection';
import type { BillingTab } from './billingWorkflowTypes';
import type { useAttendanceWorkflow } from './useAttendanceWorkflow';
import type { useAttendances } from './attendance/useAttendances';
import type { useInvoicing } from './invoicing/useInvoicing';
import type { useInvoicingWorkflow } from './invoicing/useInvoicingWorkflow';
import type { usePriceWorkflow } from './usePriceWorkflow';
import type { useProcedurePrices } from './prices/useProcedurePrices';
import type { useReceivables } from './receivables/useReceivables';
import type { useReceivablesWorkflow } from './receivables/useReceivablesWorkflow';

type BillingSectionsProps = {
  tab: BillingTab;
  loading: boolean;
  canManageBilling: boolean;
  isMedical: boolean;
  medicalUsers: MedicalUserOption[];
  convenios: Convenio[];
  opmeFornecedores: OpmeFornecedor[];
  attendance: ReturnType<typeof useAttendances>;
  invoicing: ReturnType<typeof useInvoicing>;
  receivables: ReturnType<typeof useReceivables>;
  prices: ReturnType<typeof useProcedurePrices>;
  attendanceWorkflow: ReturnType<typeof useAttendanceWorkflow>;
  invoicingWorkflow: ReturnType<typeof useInvoicingWorkflow>;
  receivablesWorkflow: ReturnType<typeof useReceivablesWorkflow>;
  priceWorkflow: ReturnType<typeof usePriceWorkflow>;
};

export function BillingSections({
  tab,
  loading,
  canManageBilling,
  isMedical,
  medicalUsers,
  convenios,
  opmeFornecedores,
  attendance,
  invoicing,
  receivables,
  prices,
  attendanceWorkflow,
  invoicingWorkflow,
  receivablesWorkflow,
  priceWorkflow,
}: BillingSectionsProps) {
  return (
    <>
      {tab === 'atendimentos' && (
        <AttendanceSection
          editingId={attendance.editingAttendanceId}
          showForm={attendance.showForm}
          form={attendance.atendimentoForm}
          procedimentos={attendance.procedimentos}
          pacientes={attendance.pacientes}
          hospitais={attendance.hospitais}
          convenios={convenios}
          opmeFornecedores={opmeFornecedores}
          medicalUsers={medicalUsers}
          isMedical={isMedical}
          loading={loading}
          atendimentos={attendance.atendimentos}
          pendingFiles={attendance.pendingFiles}
          fileInputKey={attendance.fileInputKey}
          setForm={attendance.setAtendimentoForm}
          setProcedimentos={attendance.setProcedimentos}
          onToggleForm={() => attendance.setShowForm((current) => !current)}
          onOpenCbhpm={() => attendance.setCbhpmModalOpen(true)}
          onSubmit={attendanceWorkflow.submit}
          onCancelEditing={attendanceWorkflow.resetForm}
          onSelect={attendance.setSelectedAttendance}
          onEdit={attendanceWorkflow.edit}
          onDelete={attendanceWorkflow.confirmDelete}
          onFilesChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            attendance.setPendingFiles((current) => [...current, ...files]);
          }}
          onRemoveFile={(index) =>
            attendance.setPendingFiles((current) =>
              current.filter((_, currentIndex) => currentIndex !== index),
            )
          }
        />
      )}

      {tab === 'faturamento' && (
        <InvoicingSection
          canManage={canManageBilling}
          editingId={invoicing.editingBillingId}
          showForm={attendance.showForm}
          loading={loading}
          form={invoicing.faturamentoForm}
          atendimentos={attendance.atendimentos}
          faturamentos={invoicing.faturamentos}
          setForm={invoicing.setFaturamentoForm}
          onToggleForm={() => attendance.setShowForm((current) => !current)}
          onSubmit={invoicingWorkflow.submit}
          onCancelEditing={invoicingWorkflow.resetForm}
          onSelect={invoicing.setSelectedBilling}
          onEdit={invoicingWorkflow.edit}
          onDelete={invoicingWorkflow.confirmDelete}
          onPrepare={(item) => invoicingWorkflow.changeStatus(item, 'ProntoParaEnvio')}
          onSend={(item) => invoicingWorkflow.changeStatus(item, 'Enviado')}
          onOpenReturn={invoicingWorkflow.openReturn}
          onCreateAccount={invoicingWorkflow.createAccount}
          onOpenAppeal={invoicingWorkflow.openAppeal}
        />
      )}

      {tab === 'financeiro' && canManageBilling && (
        <FinanceSection
          resumo={receivables.financeiroResumo}
          received={receivables.received}
          openBalance={receivables.openBalance}
          filters={receivables.financeFilters}
          receipt={receivables.receipt}
          receiptToast={receivables.receiptToast}
          contas={receivables.contas}
          convenios={convenios}
          medicalUsers={medicalUsers}
          pacientes={attendance.pacientes}
          page={receivables.financePage}
          loading={loading}
          setFilters={receivables.setFinanceFilters}
          setReceipt={receivables.setReceipt}
          onApplyFilters={(page) => void receivablesWorkflow.applyFilters(page)}
          onSubmitReceipt={receivablesWorkflow.submitReceipt}
          onReceiptFileChange={receivablesWorkflow.handleReceiptFileChange}
          onSelectAccount={receivables.setSelectedAccount}
          onOpenReversal={(id, valor) => receivables.setReversalTarget({ id, valor })}
        />
      )}

      {tab === 'precos' && (
        <PricesSection
          canManage={canManageBilling}
          editingId={prices.editingPriceId}
          loading={loading}
          form={prices.price}
          convenios={convenios}
          precos={prices.precos}
          setForm={prices.setPrice}
          onSubmit={priceWorkflow.submit}
          onCancelEditing={priceWorkflow.resetForm}
          onEdit={priceWorkflow.edit}
          onDeactivate={priceWorkflow.confirmDeactivate}
        />
      )}
    </>
  );
}
