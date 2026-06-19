import type { DashboardNotification, DashboardSummary } from '../types';
import { get } from './api';

export function getDashboardSummary(token: string) {
  return get<DashboardSummary>('/api/dashboard/summary', token);
}

export function getDashboardNotifications(token: string) {
  return get<DashboardNotification[]>('/api/dashboard/notifications', token);
}
