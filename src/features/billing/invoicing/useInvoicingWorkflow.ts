import {
  useInvoicingWorkflowActions,
  type InvoicingWorkflowOptions,
} from './useInvoicingWorkflowActions';

export function useInvoicingWorkflow(options: InvoicingWorkflowOptions) {
  return useInvoicingWorkflowActions(options);
}
