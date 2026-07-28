import type { DashboardNotification, DashboardSummary } from '../shared/domain/dashboardContracts';
import { get } from './api';

export function getDashboardSummary(token: string, background = false) {
  return get<DashboardSummary>(
    '/api/dashboard/summary',
    token,
    background ? { activity: 'background' } : undefined,
  );
}

export function getDashboardNotifications(token: string, background = false) {
  return get<DashboardNotification[]>(
    '/api/dashboard/notifications',
    token,
    background ? { activity: 'background' } : undefined,
  );
}
