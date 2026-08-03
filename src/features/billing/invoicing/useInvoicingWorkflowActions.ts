import { createInvoicingCrudActions } from './invoicingCrudActions';
import { createInvoicingReconciliationActions } from './invoicingReconciliationActions';
import type { InvoicingWorkflowOptions } from './invoicingWorkflowActionTypes';

export function useInvoicingWorkflowActions(options: InvoicingWorkflowOptions) {
  return {
    ...createInvoicingCrudActions(options),
    ...createInvoicingReconciliationActions(options),
  };
}
