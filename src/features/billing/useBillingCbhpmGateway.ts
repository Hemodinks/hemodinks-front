import { getCbhpmGeral } from '../../services';
import type { CbhpmListQuery } from '../../shared/domain/apiTypes';

export function useBillingCbhpmGateway(token: string) {
  return {
    search: (params: CbhpmListQuery) => getCbhpmGeral(token, params),
  };
}
