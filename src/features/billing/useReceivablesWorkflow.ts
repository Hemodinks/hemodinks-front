import {
  useReceivablesWorkflowActions,
  type ReceivablesWorkflowOptions,
} from './useReceivablesWorkflowActions';

export function useReceivablesWorkflow(options: ReceivablesWorkflowOptions) {
  return useReceivablesWorkflowActions(options);
}
