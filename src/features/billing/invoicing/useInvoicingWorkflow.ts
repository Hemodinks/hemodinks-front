import { useInvoicingWorkflowActions } from './useInvoicingWorkflowActions';
import type { InvoicingWorkflowOptions } from './invoicingWorkflowActionTypes';

export function useInvoicingWorkflow(options: InvoicingWorkflowOptions) {
  return useInvoicingWorkflowActions(options);
}
