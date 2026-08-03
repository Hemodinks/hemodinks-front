import { useEffect, useState } from 'react';
import { useAsyncOperation } from '../../shared/hooks/useAsyncOperation';
import { getErrorMessage } from '../../shared/utils/formatters';
import type { AgendaEvent } from './agendaTypes';
import type { useAgendaGateway } from './useAgendaGateway';

type AgendaGateway = ReturnType<typeof useAgendaGateway>;

type AgendaResourcesOptions = {
  agendaGateway: AgendaGateway;
  days: Date[];
  firstGridDate: Date;
  lastGridDate: Date;
  sessionToken: string;
};

export function useAgendaResources({
  agendaGateway,
  days,
  firstGridDate,
  lastGridDate,
  sessionToken,
}: AgendaResourcesOptions) {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [medicalUsers, setMedicalUsers] = useState<
    Awaited<ReturnType<typeof agendaGateway.listMedicalUsers>>
  >([]);
  const [notificationRecipientOptions, setNotificationRecipientOptions] = useState<Awaited<
    ReturnType<typeof agendaGateway.listNotificationRecipients>
  > | null>(null);
  const [notificationRecipientsError, setNotificationRecipientsError] = useState('');
  const [holidays, setHolidays] = useState<Awaited<ReturnType<typeof agendaGateway.listHolidays>>>(
    [],
  );
  const [error, setError] = useState('');
  const [holidayError, setHolidayError] = useState('');
  const eventsOperation = useAsyncOperation((_signal, start: string, end: string) =>
    agendaGateway.list(start, end),
  );
  const holidaysOperation = useAsyncOperation((_signal, years: number[]) =>
    Promise.all(years.map((year) => agendaGateway.listHolidays(year))),
  );
  const medicalUsersOperation = useAsyncOperation(() => agendaGateway.listMedicalUsers());
  const recipientsOperation = useAsyncOperation(() => agendaGateway.listNotificationRecipients());

  const loadEvents = async () => {
    setError('');
    try {
      setEvents(
        await eventsOperation.execute(firstGridDate.toISOString(), lastGridDate.toISOString()),
      );
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  };

  useEffect(() => {
    void loadEvents();
  }, [sessionToken, firstGridDate.toISOString(), lastGridDate.toISOString()]);

  useEffect(() => {
    const years = Array.from(new Set(days.map((date) => date.getFullYear())));
    setHolidayError('');
    void holidaysOperation
      .execute(years)
      .then((result) => setHolidays(result.flat()))
      .catch((caughtError) => setHolidayError(getErrorMessage(caughtError)));
  }, [days]);

  useEffect(() => {
    void medicalUsersOperation
      .execute()
      .then(setMedicalUsers)
      .catch((caughtError) => setError(getErrorMessage(caughtError)));
  }, [sessionToken]);

  useEffect(() => {
    setNotificationRecipientsError('');
    void recipientsOperation
      .execute()
      .then((options) => {
        setNotificationRecipientOptions(options);
        setNotificationRecipientsError('');
      })
      .catch((caughtError) => {
        const message = getErrorMessage(caughtError);
        setNotificationRecipientOptions(null);
        setNotificationRecipientsError(message);
        setError(message);
      });
  }, [sessionToken]);

  return {
    error,
    events,
    holidayError,
    holidays,
    loading: eventsOperation.isLoading,
    holidayLoading: holidaysOperation.isLoading,
    loadEvents,
    medicalUsers,
    notificationRecipientOptions,
    notificationRecipientsError,
    notificationRecipientsLoading: recipientsOperation.isLoading,
    setError,
    setEvents,
  };
}
