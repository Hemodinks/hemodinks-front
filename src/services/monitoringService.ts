import type { MonitoringErrorPage } from '../types';
import { del, get } from './api';
import { buildListQueryParams } from './queryParams';

export function getMonitoringErrors(token: string, page = 1, pageSize = 25) {
  return get<MonitoringErrorPage>('/api/monitoramento/erros', token, {
    params: buildListQueryParams({ page, pageSize }),
  });
}

export function clearMonitoringErrors(token: string) {
  return del<{ clearedAt: string }>('/api/monitoramento/erros', token);
}
