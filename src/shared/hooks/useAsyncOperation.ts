import { useCallback, useEffect, useRef, useState } from 'react';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error' | 'cancelled';

export type AsyncOperationState<TResult> = {
  status: AsyncStatus;
  data: TResult | null;
  error: unknown;
};

const initialState = {
  status: 'idle',
  data: null,
  error: null,
} as const;

export function useAsyncOperation<TArguments extends unknown[], TResult>(
  operation: (signal: AbortSignal, ...arguments_: TArguments) => Promise<TResult>,
) {
  const [state, setState] = useState<AsyncOperationState<TResult>>(initialState);
  const operationRef = useRef(operation);
  const controllerRef = useRef<AbortController | null>(null);
  const lastArgumentsRef = useRef<TArguments | null>(null);
  operationRef.current = operation;

  const cancel = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller || controller.signal.aborted) {
      return;
    }
    controller.abort();
    setState((current) => ({ ...current, status: 'cancelled', error: null }));
  }, []);

  const execute = useCallback(async (...arguments_: TArguments) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    lastArgumentsRef.current = arguments_;
    setState({ status: 'loading', data: null, error: null });

    try {
      const data = await operationRef.current(controller.signal, ...arguments_);
      if (!controller.signal.aborted) {
        setState({ status: 'success', data, error: null });
      }
      return data;
    } catch (error) {
      if (controller.signal.aborted) {
        setState((current) => ({ ...current, status: 'cancelled', error: null }));
      } else {
        setState({ status: 'error', data: null, error });
      }
      throw error;
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }, []);

  const retry = useCallback(() => {
    if (!lastArgumentsRef.current) {
      return undefined;
    }
    return execute(...lastArgumentsRef.current);
  }, [execute]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    lastArgumentsRef.current = null;
    setState(initialState);
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return {
    ...state,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    execute,
    cancel,
    retry,
    reset,
  };
}
