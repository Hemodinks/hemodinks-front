import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AlertMessage, Button, DataPanel } from '../../shared/components/ui';
import type {
  Convenio,
  MedicalUserOption,
  OpmeFornecedor,
} from '../../shared/domain/clinicalContracts';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import { BillingModals } from './BillingModals';
import { BillingSections } from './BillingSections';
import { useAttendances } from './attendance/useAttendances';
import { useInvoicing } from './invoicing/useInvoicing';
import { useReceivables } from './receivables/useReceivables';
import { useProcedurePrices } from './prices/useProcedurePrices';
import { useAttendanceWorkflow } from './useAttendanceWorkflow';
import { useInvoicingWorkflow } from './invoicing/useInvoicingWorkflow';
import { useReceivablesWorkflow } from './receivables/useReceivablesWorkflow';
import { useAsyncOperation } from '../../shared/hooks/useAsyncOperation';
import { usePriceWorkflow } from './usePriceWorkflow';
import type { BillingTab, ConfirmAction, RunBillingAction } from './billingWorkflowTypes';
import './billing.css';

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
  section = 'atendimentos',
}: BillingPageProps) {
  const tab = section;
  const attendance = useAttendances(isMedical ? String(session.user.id) : '', session.token);
  const { setAtendimentos, setPacientes, setShowForm, loadAttendances } = attendance;
  const invoicing = useInvoicing(session.token);
  const { loadInvoicing } = invoicing;
  const receivables = useReceivables(session.token);
  const { receiptToast, setReceiptToast, loadReceivables } = receivables;
  const prices = useProcedurePrices(session.token);
  const { loadProcedurePrices } = prices;
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{
    section: BillingTab;
    message: string;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const moduleLoadOperation = useAsyncOperation(async () => {
    if (tab === 'atendimentos') {
      await loadAttendances(session.token);
    } else if (tab === 'faturamento') {
      setAtendimentos(await loadInvoicing(session.token));
    } else if (tab === 'financeiro' && !isMedical) {
      setPacientes(await loadReceivables(session.token));
    } else if (tab === 'precos') {
      await loadProcedurePrices(session.token);
    }
  });
  const billingActionOperation = useAsyncOperation((_signal, action: () => Promise<unknown>) =>
    action(),
  );

  const canManageBilling = !isMedical;

  const load = async () => {
    setError('');
    try {
      await moduleLoadOperation.execute();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o módulo.');
    }
  };
  useEffect(() => {
    void load();
  }, [session.token, tab]);

  useEffect(() => {
    setError('');
    setSuccess(null);
    setReceiptToast(null);
  }, [tab]);

  useEffect(() => {
    if (!success) return;

    const timeoutId = window.setTimeout(() => setSuccess(null), 10000);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  useEffect(() => {
    if (!receiptToast) return;

    const timeoutId = window.setTimeout(() => setReceiptToast(null), 10000);
    return () => window.clearTimeout(timeoutId);
  }, [receiptToast]);

  const run: RunBillingAction = async (action, message, feedback) => {
    const actionSection = tab;
    setError('');
    setSuccess(null);
    try {
      await billingActionOperation.execute(action);
      setSuccess({ section: actionSection, message });
      feedback?.onSuccess?.(message);
      setShowForm(false);
      await load();
      return true;
    } catch (reason) {
      const errorMessage = reason instanceof Error ? reason.message : 'Operação não concluída.';
      setError(errorMessage);
      feedback?.onError?.(errorMessage);
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
    setError,
  });
  const loading =
    moduleLoadOperation.isLoading ||
    billingActionOperation.isLoading ||
    receivablesWorkflow.isLoading;
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
              {tab === 'atendimentos'
                ? 'Atendimentos cirúrgicos'
                : tab === 'faturamento'
                  ? 'Faturamento'
                  : tab === 'financeiro'
                    ? 'Financeiro'
                    : 'Tabela de preços'}
            </h2>
          </div>
          <Button onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} /> Atualizar
          </Button>
        </div>
      </DataPanel>
      {error && <AlertMessage type="error">{error}</AlertMessage>}
      {success?.section === tab && <AlertMessage type="success">{success.message}</AlertMessage>}

      <BillingSections
        tab={tab}
        loading={loading}
        canManageBilling={canManageBilling}
        isMedical={isMedical}
        medicalUsers={medicalUsers}
        convenios={convenios}
        opmeFornecedores={opmeFornecedores}
        attendance={attendance}
        invoicing={invoicing}
        receivables={receivables}
        prices={prices}
        attendanceWorkflow={attendanceWorkflow}
        invoicingWorkflow={invoicingWorkflow}
        receivablesWorkflow={receivablesWorkflow}
        priceWorkflow={priceWorkflow}
      />

      <BillingModals
        session={session}
        loading={loading}
        canManageBilling={canManageBilling}
        attendance={attendance}
        invoicing={invoicing}
        receivables={receivables}
        attendanceWorkflow={attendanceWorkflow}
        invoicingWorkflow={invoicingWorkflow}
        receivablesWorkflow={receivablesWorkflow}
        confirmAction={confirmAction}
        setConfirmAction={setConfirmAction}
        run={run}
      />
    </section>
  );
}
