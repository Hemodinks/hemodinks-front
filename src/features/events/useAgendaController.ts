import { type FormEvent, useEffect, useMemo, useState } from 'react';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import { useConfirmationDialog } from '../../shared/components/ConfirmationDialog';
import { useAsyncOperation } from '../../shared/hooks/useAsyncOperation';
import { getErrorMessage } from '../../shared/utils/formatters';
import type { AgendaEvent, AgendaEventPayload } from './agendaTypes';
import { useAgendaGateway } from './useAgendaGateway';
import {
  type AgendaFormData,
  type AgendaSection,
  buildEmptyForm,
  composeDateTime,
  defaultReminderMinutes,
  eventTouchesDate,
  fromDateKey,
  mergeAgendaEvent,
  monthGrid,
  toDateKey,
  toTimeInput,
} from './agendaUtils';

type AgendaControllerOptions = {
  session: AuthSession;
  isMedical: boolean;
};

export function useAgendaController({ session, isMedical }: AgendaControllerOptions) {
  const agendaGateway = useAgendaGateway(session.token);
  const { confirmAction, confirmationDialog } = useConfirmationDialog();
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState(() => fromDateKey(todayKey));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [activeSection, setActiveSection] = useState<AgendaSection>('calendario');
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
  const [successMessage, setSuccessMessage] = useState('');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AgendaFormData>(() =>
    buildEmptyForm(todayKey, isMedical, session.user.id),
  );
  const eventsOperation = useAsyncOperation((_signal, start: string, end: string) =>
    agendaGateway.list(start, end),
  );
  const holidaysOperation = useAsyncOperation((_signal, years: number[]) =>
    Promise.all(years.map((year) => agendaGateway.listHolidays(year))),
  );
  const medicalUsersOperation = useAsyncOperation(() => agendaGateway.listMedicalUsers());
  const recipientsOperation = useAsyncOperation(() => agendaGateway.listNotificationRecipients());
  const saveOperation = useAsyncOperation(
    (_signal, id: number | null, payload: AgendaEventPayload) =>
      id ? agendaGateway.update(id, payload) : agendaGateway.create(payload),
  );
  const completeOperation = useAsyncOperation((_signal, id: number) => agendaGateway.complete(id));
  const deleteOperation = useAsyncOperation((_signal, id: number) => agendaGateway.delete(id));

  const days = useMemo(() => monthGrid(visibleMonth), [visibleMonth]);
  const firstGridDate = days[0];
  const lastGridDate = days[days.length - 1];
  const holidayByDate = useMemo(
    () =>
      new Map(
        holidays
          .filter((holiday) => holiday.global || holiday.types?.includes('Public'))
          .map((holiday) => [holiday.date, holiday]),
      ),
    [holidays],
  );
  const selectedHoliday = holidayByDate.get(selectedDate);
  const selectedEvents = useMemo(
    () =>
      events
        .filter((event) => eventTouchesDate(event, selectedDate))
        .sort(
          (first, second) => new Date(first.start).getTime() - new Date(second.start).getTime(),
        ),
    [events, selectedDate],
  );

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
  }, [session.token, firstGridDate.toISOString(), lastGridDate.toISOString()]);

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
  }, [session.token]);

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
  }, [session.token]);

  const resetForm = (dateKey = selectedDate) => {
    setEditingEventId(null);
    setFormData(buildEmptyForm(dateKey, isMedical, session.user.id));
  };

  const handleSelectDate = (date: Date) => {
    const dateKey = toDateKey(date);
    setSelectedDate(dateKey);
    if (!editingEventId) {
      setFormData((current) => ({ ...current, startDate: dateKey, endDate: dateKey }));
    }
  };

  const handleToday = () => {
    const today = fromDateKey(todayKey);
    setActiveSection('calendario');
    setVisibleMonth(today);
    setSelectedDate(todayKey);
    resetForm(todayKey);
  };

  const buildPayload = (): AgendaEventPayload => {
    const reminderPeriod =
      formData.notifyUser || formData.notifyMedicalProfile
        ? Number(formData.reminderPeriodMinutes || defaultReminderMinutes)
        : null;
    return {
      medicalUserId:
        formData.notifyMedicalProfile && formData.medicalUserId
          ? Number(formData.medicalUserId)
          : null,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      start: composeDateTime(formData.startDate, formData.startTime).toISOString(),
      end: composeDateTime(formData.endDate, formData.endTime).toISOString(),
      notifyMedicalProfile: formData.notifyMedicalProfile,
      notifyUser: formData.notifyUser,
      reminderPeriodMinutes: reminderPeriod,
      notificationMessage: formData.notificationMessage.trim() || null,
      notifyAllAllowedRecipients: formData.notifyAllAllowedRecipients,
      notificationUserIds: formData.notificationUserIds,
      notificationGroupIds: formData.notificationGroupIds,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!formData.title.trim()) {
      setError('Informe o titulo do evento.');
      return;
    }
    if (
      composeDateTime(formData.endDate, formData.endTime) <=
      composeDateTime(formData.startDate, formData.startTime)
    ) {
      setError('A data final deve ser maior que a inicial.');
      return;
    }
    const hasNotificationMessage = formData.notificationMessage.trim().length > 0;
    const hasNotificationRecipients =
      formData.notifyAllAllowedRecipients ||
      formData.notificationUserIds.length > 0 ||
      formData.notificationGroupIds.length > 0;
    if (hasNotificationRecipients && !hasNotificationMessage) {
      setError('Informe a mensagem da notificação.');
      return;
    }
    if (hasNotificationMessage && !hasNotificationRecipients) {
      setError('Selecione ao menos um destinatário para enviar a notificação.');
      return;
    }
    try {
      const savedEvent = await saveOperation.execute(editingEventId, buildPayload());
      setEvents((current) => mergeAgendaEvent(current, savedEvent));
      setSuccessMessage(editingEventId ? 'Evento atualizado.' : 'Evento cadastrado.');
      const savedDate = new Date(savedEvent.start);
      const savedDateKey = toDateKey(savedDate);
      setSelectedDate(savedDateKey);
      setVisibleMonth(new Date(savedDate.getFullYear(), savedDate.getMonth(), 1));
      resetForm(savedDateKey);
      setActiveSection('calendario');
      void loadEvents();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  };

  const handleEdit = (agendaEvent: AgendaEvent) => {
    const start = new Date(agendaEvent.start);
    const end = new Date(agendaEvent.end);
    const startDate = toDateKey(start);
    setActiveSection('cadastro');
    setSelectedDate(startDate);
    setVisibleMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    setEditingEventId(agendaEvent.id);
    setFormData({
      title: agendaEvent.title,
      description: agendaEvent.description ?? '',
      startDate,
      startTime: toTimeInput(start),
      endDate: toDateKey(end),
      endTime: toTimeInput(end),
      notifyMedicalProfile: agendaEvent.notifyMedicalProfile,
      medicalUserId: agendaEvent.medicalUserId ? String(agendaEvent.medicalUserId) : '',
      notifyUser: agendaEvent.notifyUser,
      reminderPeriodMinutes: String(agendaEvent.reminderPeriodMinutes ?? defaultReminderMinutes),
      notificationMessage: '',
      notifyAllAllowedRecipients: false,
      notificationUserIds: [],
      notificationGroupIds: [],
    });
  };

  const completeSelectedEvent = async (agendaEvent: AgendaEvent) => {
    setError('');
    setSuccessMessage('');
    try {
      await completeOperation.execute(agendaEvent.id);
      setSuccessMessage('Evento concluido.');
      await loadEvents();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  };

  const handleComplete = (agendaEvent: AgendaEvent) => {
    confirmAction({
      tone: 'update',
      title: 'Concluir evento?',
      message: `Deseja marcar "${agendaEvent.title}" como concluido?`,
      confirmLabel: 'Sim',
      cancelLabel: 'Não',
      onConfirm: () => completeSelectedEvent(agendaEvent),
    });
  };

  const deleteSelectedEvent = async (agendaEvent: AgendaEvent) => {
    setError('');
    setSuccessMessage('');
    try {
      await deleteOperation.execute(agendaEvent.id);
      setEvents((current) => current.filter((event) => event.id !== agendaEvent.id));
      setSuccessMessage('Evento excluido.');
      if (editingEventId === agendaEvent.id) resetForm();
      await loadEvents();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  };

  const handleDelete = (agendaEvent: AgendaEvent) => {
    confirmAction({
      tone: 'delete',
      title: 'Excluir evento?',
      message: `Deseja excluir "${agendaEvent.title}"? Esta ação não poderá ser desfeita.`,
      confirmLabel: 'Sim',
      cancelLabel: 'Não',
      onConfirm: () => deleteSelectedEvent(agendaEvent),
    });
  };

  const toggleNotificationUser = (userId: number) =>
    setFormData((current) => ({
      ...current,
      notificationUserIds: current.notificationUserIds.includes(userId)
        ? current.notificationUserIds.filter((id) => id !== userId)
        : [...current.notificationUserIds, userId],
    }));

  const toggleNotificationGroup = (groupId: number) =>
    setFormData((current) => ({
      ...current,
      notificationGroupIds: current.notificationGroupIds.includes(groupId)
        ? current.notificationGroupIds.filter((id) => id !== groupId)
        : [...current.notificationGroupIds, groupId],
    }));

  const openDraftForSelectedDate = () => {
    setEditingEventId(null);
    setFormData(buildEmptyForm(selectedDate, isMedical, session.user.id));
    setActiveSection('cadastro');
  };

  return {
    activeSection,
    setActiveSection,
    visibleMonth,
    days,
    events,
    selectedDate,
    selectedEvents,
    selectedHoliday,
    holidayByDate,
    todayKey,
    medicalUsers,
    notificationRecipientOptions,
    notificationRecipientsError,
    successMessage,
    error,
    holidayError,
    editingEventId,
    formData,
    setFormData,
    pendingEventsCount: events.filter((event) => !event.isCompleted).length,
    loading: eventsOperation.isLoading,
    holidayLoading: holidaysOperation.isLoading,
    notificationRecipientsLoading: recipientsOperation.isLoading,
    formLoading: saveOperation.isLoading,
    confirmationDialog,
    loadEvents,
    resetForm,
    handleSelectDate,
    handlePreviousMonth: () =>
      setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)),
    handleNextMonth: () =>
      setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)),
    handleToday,
    handleSubmit,
    handleEdit,
    handleComplete,
    handleDelete,
    toggleNotificationUser,
    toggleNotificationGroup,
    openDraftForSelectedDate,
  };
}
