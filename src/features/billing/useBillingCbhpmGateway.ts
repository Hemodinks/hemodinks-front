import { getCbhpmGeral } from "../../services";
import type { CbhpmListQuery } from "../../types";

export function useBillingCbhpmGateway(token: string) {
  return {
    search: (params: CbhpmListQuery) => getCbhpmGeral(token, params),
  };
}
