import { createReceivableMutationActions } from './receivableMutationActions';
import { useReceivableQueryActions } from './useReceivableQueryActions';
import type { ReceivablesWorkflowOptions } from './receivablesWorkflowActionTypes';

export function useReceivablesWorkflowActions(options: ReceivablesWorkflowOptions) {
  return {
    ...useReceivableQueryActions(options),
    ...createReceivableMutationActions(options),
  };
}
