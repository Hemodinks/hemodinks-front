import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  completeAgendaEvent, createAgendaEvent, deleteAgendaEvent, getAgendaEvents, getAgendaMedicalUsers,
  getAgendaNotificationRecipientOptions, getBrazilPublicHolidays, updateAgendaEvent,
} from '../../services';
import { useConfirmationDialog } from '../../shared/components/ConfirmationDialog';
import { getErrorMessage } from '../../shared/utils/formatters';
import type { AgendaEvent, AgendaEventPayload, AgendaMedicalUser, AgendaNotificationRecipientOptions, AuthSession, PublicHoliday } from '../../types';
import {
  type AgendaFormData, type AgendaSection, buildEmptyForm, composeDateTime, defaultReminderMinutes,
  eventTouchesDate, fromDateKey, mergeAgendaEvent, monthGrid, toDateKey, toTimeInput,
} from './agendaUtils';

type UseAgendaControllerOptions = { session: AuthSession; isMedical: boolean };

export function useAgendaController({ session, isMedical }: UseAgendaControllerOptions) {
  const { confirmAction, confirmationDialog } = useConfirmationDialog();
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState(() => fromDateKey(todayKey));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [activeSection, setActiveSection] = useState<AgendaSection>('calendario');
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [medicalUsers, setMedicalUsers] = useState<AgendaMedicalUser[]>([]);
  const [notificationRecipientOptions, setNotificationRecipientOptions] = useState<AgendaNotificationRecipientOptions | null>(null);
  const [notificationRecipientsLoading, setNotificationRecipientsLoading] = useState(false);
  const [notificationRecipientsError, setNotificationRecipientsError] = useState('');
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(false);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [holidayError, setHolidayError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AgendaFormData>(() => buildEmptyForm(todayKey, isMedical, session.user.id));

  const days = useMemo(() => monthGrid(visibleMonth), [visibleMonth]);
  const firstGridDate = days[0];
  const lastGridDate = days[days.length - 1];
  const holidayByDate = useMemo(() => new Map(holidays.filter((holiday) => holiday.global || holiday.types?.includes('Public'))
    .map((holiday) => [holiday.date, holiday])), [holidays]);
  const selectedHoliday = holidayByDate.get(selectedDate);
  const selectedEvents = useMemo(() => events.filter((event) => eventTouchesDate(event, selectedDate))
    .sort((first, second) => new Date(first.start).getTime() - new Date(second.start).getTime()), [events, selectedDate]);
  const pendingEventsCount = events.filter((event) => !event.isCompleted).length;

  const loadEvents = async () => {
    setLoading(true); setError('');
    try {
      setEvents(await getAgendaEvents(session.token, firstGridDate.toISOString(), lastGridDate.toISOString()));
    } catch (caughtError) { setError(getErrorMessage(caughtError)); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadEvents(); }, [session.token, firstGridDate.toISOString(), lastGridDate.toISOString()]);
  useEffect(() => {
    const years = Array.from(new Set(days.map((date) => date.getFullYear())));
    setHolidayLoading(true); setHolidayError('');
    void Promise.all(years.map((year) => getBrazilPublicHolidays(year))).then((result) => setHolidays(result.flat()))
      .catch((caughtError) => setHolidayError(getErrorMessage(caughtError))).finally(() => setHolidayLoading(false));
  }, [days]);
  useEffect(() => { void getAgendaMedicalUsers(session.token).then(setMedicalUsers).catch((caughtError) => setError(getErrorMessage(caughtError))); }, [session.token]);
  useEffect(() => {
    setNotificationRecipientsLoading(true); setNotificationRecipientsError('');
    void getAgendaNotificationRecipientOptions(session.token).then((options) => {
      setNotificationRecipientOptions(options); setNotificationRecipientsError('');
    }).catch((caughtError) => {
      const message = getErrorMessage(caughtError);
      setNotificationRecipientOptions(null); setNotificationRecipientsError(message); setError(message);
    }).finally(() => setNotificationRecipientsLoading(false));
  }, [session.token]);

  const resetForm = (dateKey = selectedDate) => { setEditingEventId(null); setFormData(buildEmptyForm(dateKey, isMedical, session.user.id)); };
  const openCalendarSection = () => setActiveSection('calendario');
  const openCadastroSection = () => setActiveSection('cadastro');
  const handleSelectDate = (date: Date) => {
    const dateKey = toDateKey(date); setSelectedDate(dateKey);
    if (!editingEventId) setFormData((current) => ({ ...current, startDate: dateKey, endDate: dateKey }));
  };
  const handlePreviousMonth = () => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  const handleNextMonth = () => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  const handleToday = () => {
    const today = fromDateKey(todayKey); setActiveSection('calendario'); setVisibleMonth(today); setSelectedDate(todayKey); resetForm(todayKey);
  };
  const buildPayload = (): AgendaEventPayload => {
    const start = composeDateTime(formData.startDate, formData.startTime);
    const end = composeDateTime(formData.endDate, formData.endTime);
    const reminderPeriod = formData.notifyUser || formData.notifyMedicalProfile ? Number(formData.reminderPeriodMinutes || defaultReminderMinutes) : null;
    return {
      medicalUserId: formData.notifyMedicalProfile && formData.medicalUserId ? Number(formData.medicalUserId) : null,
      title: formData.title.trim(), description: formData.description.trim() || null, start: start.toISOString(), end: end.toISOString(),
      notifyMedicalProfile: formData.notifyMedicalProfile, notifyUser: formData.notifyUser, reminderPeriodMinutes: reminderPeriod,
      notificationMessage: formData.notificationMessage.trim() || null, notifyAllAllowedRecipients: formData.notifyAllAllowedRecipients,
      notificationUserIds: formData.notificationUserIds, notificationGroupIds: formData.notificationGroupIds,
    };
  };
  const toggleNotificationUser = (userId: number) => setFormData((current) => ({ ...current,
    notificationUserIds: current.notificationUserIds.includes(userId) ? current.notificationUserIds.filter((id) => id !== userId) : [...current.notificationUserIds, userId],
  }));
  const toggleNotificationGroup = (groupId: number) => setFormData((current) => ({ ...current,
    notificationGroupIds: current.notificationGroupIds.includes(groupId) ? current.notificationGroupIds.filter((id) => id !== groupId) : [...current.notificationGroupIds, groupId],
  }));
  const openDraftForSelectedDate = () => { resetForm(selectedDate); openCadastroSection(); };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setSuccessMessage('');
    if (!formData.title.trim()) { setError('Informe o titulo do evento.'); return; }
    if (composeDateTime(formData.endDate, formData.endTime) <= composeDateTime(formData.startDate, formData.startTime)) {
      setError('A data final deve ser maior que a inicial.'); return;
    }
    const hasNotificationMessage = formData.notificationMessage.trim().length > 0;
    const hasNotificationRecipients = formData.notifyAllAllowedRecipients || formData.notificationUserIds.length > 0 || formData.notificationGroupIds.length > 0;
    if (hasNotificationRecipients && !hasNotificationMessage) { setError('Informe a mensagem da notificação.'); return; }
    if (hasNotificationMessage && !hasNotificationRecipients) { setError('Selecione ao menos um destinatário para enviar a notificação.'); return; }
    setFormLoading(true);
    try {
      const savedEvent = editingEventId ? await updateAgendaEvent(editingEventId, buildPayload(), session.token) : await createAgendaEvent(buildPayload(), session.token);
      setEvents((current) => mergeAgendaEvent(current, savedEvent)); setSuccessMessage(editingEventId ? 'Evento atualizado.' : 'Evento cadastrado.');
      const savedDate = new Date(savedEvent.start); const savedDateKey = toDateKey(savedDate);
      setSelectedDate(savedDateKey); setVisibleMonth(new Date(savedDate.getFullYear(), savedDate.getMonth(), 1)); resetForm(savedDateKey);
      setActiveSection('calendario'); void loadEvents();
    } catch (caughtError) { setError(getErrorMessage(caughtError)); }
    finally { setFormLoading(false); }
  };
  const handleEdit = (agendaEvent: AgendaEvent) => {
    const start = new Date(agendaEvent.start); const end = new Date(agendaEvent.end); const startDate = toDateKey(start);
    setActiveSection('cadastro'); setSelectedDate(startDate); setVisibleMonth(new Date(start.getFullYear(), start.getMonth(), 1)); setEditingEventId(agendaEvent.id);
    setFormData({ title: agendaEvent.title, description: agendaEvent.description ?? '', startDate, startTime: toTimeInput(start), endDate: toDateKey(end),
      endTime: toTimeInput(end), notifyMedicalProfile: agendaEvent.notifyMedicalProfile,
      medicalUserId: agendaEvent.medicalUserId ? String(agendaEvent.medicalUserId) : '', notifyUser: agendaEvent.notifyUser,
      reminderPeriodMinutes: String(agendaEvent.reminderPeriodMinutes ?? defaultReminderMinutes), notificationMessage: '',
      notifyAllAllowedRecipients: false, notificationUserIds: [], notificationGroupIds: [] });
  };
  const completeSelectedEvent = async (agendaEvent: AgendaEvent) => {
    setError(''); setSuccessMessage('');
    try { await completeAgendaEvent(agendaEvent.id, session.token); setSuccessMessage('Evento concluido.'); await loadEvents(); }
    catch (caughtError) { setError(getErrorMessage(caughtError)); }
  };
  const handleComplete = (agendaEvent: AgendaEvent) => confirmAction({ tone: 'update', title: 'Concluir evento?',
    message: `Deseja marcar "${agendaEvent.title}" como concluido?`, confirmLabel: 'Sim', cancelLabel: 'Não', onConfirm: () => completeSelectedEvent(agendaEvent) });
  const deleteSelectedEvent = async (agendaEvent: AgendaEvent) => {
    const eventId = agendaEvent.id; setError(''); setSuccessMessage('');
    try { await deleteAgendaEvent(eventId, session.token); setEvents((current) => current.filter((item) => item.id !== eventId));
      setSuccessMessage('Evento excluido.'); if (editingEventId === eventId) resetForm(); await loadEvents(); }
    catch (caughtError) { setError(getErrorMessage(caughtError)); }
  };
  const handleDelete = (agendaEvent: AgendaEvent) => confirmAction({ tone: 'delete', title: 'Excluir evento?',
    message: `Deseja excluir "${agendaEvent.title}"? Esta ação não poderá ser desfeita.`, confirmLabel: 'Sim', cancelLabel: 'Não', onConfirm: () => deleteSelectedEvent(agendaEvent) });

  return { todayKey, visibleMonth, selectedDate, activeSection, events, medicalUsers, notificationRecipientOptions,
    notificationRecipientsLoading, notificationRecipientsError, loading, holidayLoading, formLoading, error, holidayError,
    successMessage, editingEventId, formData, setFormData, days, holidayByDate, selectedHoliday, selectedEvents, pendingEventsCount,
    loadEvents, openCalendarSection, openCadastroSection, handleSelectDate, handlePreviousMonth, handleNextMonth, handleToday,
    resetForm, toggleNotificationUser, toggleNotificationGroup, openDraftForSelectedDate, handleSubmit, handleEdit, handleComplete,
    handleDelete, confirmationDialog };
}
