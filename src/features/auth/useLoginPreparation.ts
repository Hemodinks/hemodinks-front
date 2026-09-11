import { useQuery } from '@tanstack/react-query';
import { listPublicClinics } from '../../services';
import { ApiError } from '../../services/api';

export function useLoginPreparation() {
  const query = useQuery({
    queryKey: ['login-preparation', 'public-clinics'],
    queryFn: async ({ signal }) => {
      const clinics = await listPublicClinics('', signal);
      if (!Array.isArray(clinics)) throw new Error('Invalid clinic response');
      return clinics;
    },
    // Only public metadata lives in memory. User membership is validated by login-context.
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,
    networkMode: 'always',
    retry: (count, error) => count < 4 && (!(error instanceof ApiError)
      || !error.status || [408, 429, 500, 502, 503, 504].includes(error.status)),
    retryDelay: attempt => Math.min((attempt + 1) * 5_000, 10_000),
    refetchOnWindowFocus: false,
  });
  return {
    ready: query.isSuccess && query.data.length > 0,
    waiting: query.isFetching || query.isPending,
    empty: query.isSuccess && query.data.length === 0,
    retry: () => { void query.refetch(); },
  };
}
