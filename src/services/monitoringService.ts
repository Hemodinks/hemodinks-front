import type { MonitoringErrorPage, SecurityObservationPage } from '../types';
import { ApiError, del, get } from './api';
import { buildListQueryParams } from './queryParams';

export function getMonitoringErrors(token: string, page = 1, pageSize = 25) {
  return get<MonitoringErrorPage>('/api/monitoramento/erros', token, {
    params: buildListQueryParams({ page, pageSize }),
  });
}

export function clearMonitoringErrors(token: string) {
  return del<{ clearedAt: string }>('/api/monitoramento/erros', token);
}

export async function getSecurityObservations(token: string, page = 1, signal?: AbortSignal): Promise<SecurityObservationPage> {
  try {
    const result = await get<SecurityObservationPage>('/api/monitoramento/seguranca', token, {
      params: buildListQueryParams({ page, pageSize: 25 }),
      signal,
      // A failed observation read must not renew, expire or otherwise change the session.
      manageSession: false,
    });
    if (!Array.isArray(result.items) || !Number.isInteger(result.page) || result.page !== page || result.page < 1 || result.page > 100
      || !Number.isInteger(result.pageSize) || result.pageSize < 1 || result.pageSize > 100
      || result.items.length > result.pageSize) throw new Error('Invalid observation response');
    const items = result.items.map(item => {
      if (!item || typeof item.timestamp !== 'string' || !Number.isFinite(Date.parse(item.timestamp))
        || typeof item.kind !== 'string' || typeof item.operation !== 'string' || typeof item.reason !== 'string'
        || (item.clinicId !== null && (!Number.isInteger(item.clinicId) || item.clinicId <= 0))) {
        throw new Error('Invalid observation event');
      }
      // Do not retain request IDs, account pseudonyms or unexpected payload fields.
      return { timestamp: new Date(item.timestamp).toISOString(), kind: item.kind, operation: item.operation, reason: item.reason, clinicId: item.clinicId };
    });
    return { items, page: result.page, pageSize: result.pageSize };
  } catch (error) {
    throw new Error(error instanceof ApiError && (error.status === 401 || error.status === 403)
      ? 'Você não tem acesso aos eventos de segurança neste contexto.'
      : 'Não foi possível carregar os eventos de segurança. Tente novamente.');
  }
}
