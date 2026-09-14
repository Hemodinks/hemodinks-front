import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_SYSTEM_SETTINGS,
  getDashboardNotifications,
  getDashboardSummary,
  getSystemSettings,
  markAgendaNotificationsAsRead,
} from '../services';
import { ApiError } from '../services/api';
import { queryClient } from '../queryClient';
import { queryKeys } from '../shared/queryKeys';
import { getErrorMessage } from '../shared/utils/formatters';
import type { AuthSession } from '../types';

const DASHBOARD_CACHE_TIME_MS = 30 * 1000;
const NOTIFICATIONS_CACHE_TIME_MS = 15 * 1000;

function isForbiddenError(error: unknown) {
  return error instanceof ApiError ? error.status === 403 : error instanceof Error && /\b403\b|forbidden/i.test(error.message);
}

type UseAppChromeOptions = {
  session: AuthSession | null;
};

export function useAppChrome({ session }: UseAppChromeOptions) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const sessionReady = Boolean(session && !session.user.precisaTrocarSenha);
  const dashboardSummaryQuery = useQuery({
    queryKey: queryKeys.dashboardSummary(session?.token ?? ''),
    queryFn: () => getDashboardSummary(session?.token ?? ''),
    enabled: sessionReady,
    staleTime: DASHBOARD_CACHE_TIME_MS,
  });
  const notificationsQuery = useQuery({
    queryKey: queryKeys.dashboardNotifications(session?.token ?? ''),
    queryFn: () => getDashboardNotifications(session?.token ?? ''),
    enabled: Boolean(session && notificationsOpen),
    staleTime: NOTIFICATIONS_CACHE_TIME_MS,
  });
  const systemSettingsQuery = useQuery({
    queryKey: queryKeys.systemSettings(session?.token ?? ''),
    queryFn: () => getSystemSettings(session?.token),
    enabled: Boolean(session),
    staleTime: 5 * 60 * 1000,
  });

  const systemSettings = systemSettingsQuery.data ?? DEFAULT_SYSTEM_SETTINGS;
  const companyName = systemSettings.nomeEmpresa?.trim() || DEFAULT_SYSTEM_SETTINGS.nomeEmpresa;
  const systemSettingsError = systemSettingsQuery.error ? getErrorMessage(systemSettingsQuery.error) : '';

  // Read directly from the session-keyed query: never retain a previous clinic's copy.
  const dashboardSummary = sessionReady ? dashboardSummaryQuery.data ?? null : null;
  const dashboardLoading = sessionReady && dashboardSummaryQuery.isPending;
  const dashboardError = dashboardSummaryQuery.error && !isForbiddenError(dashboardSummaryQuery.error)
    ? 'Não foi possível carregar os indicadores da clínica. Tente novamente mais tarde.' : '';
  const notifications = session ? notificationsQuery.data ?? [] : [];
  const notificationsLoading = notificationsQuery.isFetching;
  const notificationsError = notificationsQuery.error
    ? 'Não foi possível carregar as notificações. Tente novamente mais tarde.' : '';

  const loadDashboardSummary = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(token), refetchType: 'none' });
    }
    await queryClient.fetchQuery({
      queryKey: queryKeys.dashboardSummary(token),
      queryFn: () => getDashboardSummary(token),
      staleTime: DASHBOARD_CACHE_TIME_MS,
    });
  };

  const handleToggleNotifications = async () => {
    if (!session) {
      return;
    }

    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

    try {
      await markAgendaNotificationsAsRead(session.token);
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardNotifications(session.token) });
      await loadDashboardSummary(session.token, true);
    } catch {
      // A failed acknowledgement must not prevent reading the notification center.
    }
  };

  const resetAppChrome = () => {
    setNotificationsOpen(false);
  };

  return {
    dashboardSummary,
    dashboardLoading,
    dashboardError,
    notificationsOpen,
    setNotificationsOpen,
    notifications,
    notificationsLoading,
    notificationsError,
    systemSettings,
    companyName,
    systemSettingsQuery,
    systemSettingsError,
    loadDashboardSummary,
    handleToggleNotifications,
    resetAppChrome,
  };
}

export type AppChromeState = ReturnType<typeof useAppChrome>;
