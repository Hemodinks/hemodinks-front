import type { AuthSession } from '../../../shared/domain/sessionTypes';
import type { RunBillingAction } from '../billingWorkflowTypes';
import type { useReceivables } from './useReceivables';

export type ReceivablesWorkflowOptions = {
  session: AuthSession;
  receivables: ReturnType<typeof useReceivables>;
  run: RunBillingAction;
  setError: (message: string) => void;
};
