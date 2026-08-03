import { type FormEvent, useMemo, useState } from 'react';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import { useConfirmationDialog } from '../../shared/components/ConfirmationDialog';
import { useAsyncOperation } from '../../shared/hooks/useAsyncOperation';
import { getErrorMessage } from '../../shared/utils/formatters';
import type { AgendaEvent, AgendaEventPayload } from './agendaTypes';
import {
  buildAgendaEditForm,
  buildAgendaPayload,
  getAgendaFormError,
  toggleAgendaSelection,
} from './agendaControllerUtils';
import { useAgendaGateway } from './useAgendaGateway';
import { useAgendaResources } from './useAgendaResources';
import {
  type AgendaFormData,
  type AgendaSection,
  buildEmptyForm,
  eventTouchesDate,
  fromDateKey,
  mergeAgendaEvent,
  monthGrid,
  toDateKey,
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
  const [successMessage, setSuccessMessage] = useState('');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AgendaFormData>(() =>
    buildEmptyForm(todayKey, isMedical, session.user.id),
  );
  const saveOperation = useAsyncOperation(
    (_signal, id: number | null, payload: AgendaEventPayload) =>
      id ? agendaGateway.update(id, payload) : agendaGateway.create(payload),
  );
  const completeOperation = useAsyncOperation((_signal, id: number) => agendaGateway.complete(id));
  const deleteOperation = useAsyncOperation((_signal, id: number) => agendaGateway.delete(id));

  const days = useMemo(() => monthGrid(visibleMonth), [visibleMonth]);
  const firstGridDate = days[0];
  const lastGridDate = days[days.length - 1];
  const resources = useAgendaResources({
    agendaGateway,
    days,
    firstGridDate,
    lastGridDate,
    sessionToken: session.token,
  });
  const {
    error,
    events,
    holidayError,
    holidays,
    holidayLoading,
    loadEvents,
    loading,
    medicalUsers,
    notificationRecipientOptions,
    notificationRecipientsError,
    notificationRecipientsLoading,
    setError,
    setEvents,
  } = resources;
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    const formError = getAgendaFormError(formData);
    if (formError) {
      setError(formError);
      return;
    }
    try {
      const savedEvent = await saveOperation.execute(editingEventId, buildAgendaPayload(formData));
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
    const startDate = toDateKey(start);
    setActiveSection('cadastro');
    setSelectedDate(startDate);
    setVisibleMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    setEditingEventId(agendaEvent.id);
    setFormData(buildAgendaEditForm(agendaEvent));
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
      notificationUserIds: toggleAgendaSelection(current.notificationUserIds, userId),
    }));

  const toggleNotificationGroup = (groupId: number) =>
    setFormData((current) => ({
      ...current,
      notificationGroupIds: toggleAgendaSelection(current.notificationGroupIds, groupId),
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
    loading,
    holidayLoading,
    notificationRecipientsLoading,
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
