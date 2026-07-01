import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_SYSTEM_SETTINGS,
  getDashboardNotifications,
  getDashboardSummary,
  getSystemSettings,
  markAgendaNotificationsAsRead,
} from '../services';
import { setObservabilityUser } from '../observability';
import { queryClient } from '../queryClient';
import { queryKeys } from '../shared/queryKeys';
import { getErrorMessage } from '../shared/utils/formatters';
import type { AuthSession, DashboardNotification, DashboardSummary } from '../types';

const DASHBOARD_CACHE_TIME_MS = 30 * 1000;
const NOTIFICATIONS_CACHE_TIME_MS = 15 * 1000;

type UseAppChromeOptions = {
  session: AuthSession | null;
};

export function useAppChrome({ session }: UseAppChromeOptions) {
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [dashboardError, setDashboardError] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');

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
    queryKey: queryKeys.systemSettings(),
    queryFn: getSystemSettings,
    staleTime: 5 * 60 * 1000,
  });

  const systemSettings = systemSettingsQuery.data ?? DEFAULT_SYSTEM_SETTINGS;
  const companyName = systemSettings.nomeEmpresa?.trim() || DEFAULT_SYSTEM_SETTINGS.nomeEmpresa;
  const systemSettingsError = systemSettingsQuery.error ? getErrorMessage(systemSettingsQuery.error) : '';

  useEffect(() => {
    setObservabilityUser(session ? {
      id: session.user.id,
      email: session.user.email,
      nome: session.user.nome,
    } : null);
  }, [session?.user.email, session?.user.id, session?.user.nome]);

  useEffect(() => {
    if (dashboardSummaryQuery.data) {
      setDashboardSummary(dashboardSummaryQuery.data);
      setDashboardError('');
    }
  }, [dashboardSummaryQuery.data]);

  useEffect(() => {
    if (dashboardSummaryQuery.error) {
      setDashboardError(getErrorMessage(dashboardSummaryQuery.error));
    }
  }, [dashboardSummaryQuery.error]);

  useEffect(() => {
    setNotificationsLoading(notificationsQuery.isFetching);
  }, [notificationsQuery.isFetching]);

  useEffect(() => {
    if (notificationsQuery.data) {
      setNotifications(notificationsQuery.data);
      setNotificationsError('');
    }
  }, [notificationsQuery.data]);

  useEffect(() => {
    if (notificationsQuery.error) {
      setNotificationsError(getErrorMessage(notificationsQuery.error));
    }
  }, [notificationsQuery.error]);

  const loadDashboardSummary = async (token = session?.token, forceRefresh = false) => {
    if (!token) {
      return;
    }

    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(token) });
    }

    await dashboardSummaryQuery.refetch();
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

    await notificationsQuery.refetch();
    await markAgendaNotificationsAsRead(session.token);
    await notificationsQuery.refetch();
    await loadDashboardSummary(session.token, true);
  };

  const resetAppChrome = () => {
    setDashboardSummary(null);
    setDashboardError('');
    setNotificationsOpen(false);
    setNotifications([]);
    setNotificationsError('');
    setNotificationsLoading(false);
  };

  return {
    dashboardSummary,
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
