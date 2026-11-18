import { QueryClient } from '@tanstack/react-query';
import { ApiError, DATABASE_UNAVAILABLE_CODE } from './services/api';

export function retryRead(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500) return false;
  // O cliente HTTP já esperou o banco retomar pelo orçamento inteiro; repetir dobraria a espera.
  if (error instanceof ApiError && error.code === DATABASE_UNAVAILABLE_CODE) return false;
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: retryRead,
      staleTime: 30 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});
