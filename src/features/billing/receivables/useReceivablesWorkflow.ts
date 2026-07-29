import { useReceivablesWorkflowActions } from './useReceivablesWorkflowActions';
import type { ReceivablesWorkflowOptions } from './receivablesWorkflowActionTypes';

export function useReceivablesWorkflow(options: ReceivablesWorkflowOptions) {
  return useReceivablesWorkflowActions(options);
}
