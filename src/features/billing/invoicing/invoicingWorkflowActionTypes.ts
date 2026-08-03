import type { AuthSession } from '../../../shared/domain/sessionTypes';
import type { RunBillingAction, SetConfirmAction } from '../billingWorkflowTypes';
import type { useInvoicing } from './useInvoicing';

export type InvoicingWorkflowOptions = {
  session: AuthSession;
  invoicing: ReturnType<typeof useInvoicing>;
  run: RunBillingAction;
  setConfirmAction: SetConfirmAction;
  setShowForm: (value: boolean) => void;
};
