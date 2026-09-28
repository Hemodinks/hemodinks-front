import { useAgendaEvents } from './useAgendaEvents';
import { agendaRange, type AgendaView } from './agendaViews';
import type { AgendaEventFilters } from '../../services/eventsService';
import { useAgendaRecipients } from './useAgendaRecipients';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  completeAgendaEvent, createAgendaEvent, deleteAgendaEvent,
  getBrazilPublicHolidays, updateAgendaEvent,
} from '../../services';
import { useConfirmationDialog } from '../../shared/components/ConfirmationDialog';
import { getErrorMessage } from '../../shared/utils/formatters';
import type { AgendaEvent, AgendaEventPayload, AuthSession, PublicHoliday } from '../../types';
import {
  type AgendaFormData, type AgendaSection, buildEmptyForm, composeDateTime, defaultReminderMinutes,
  eventTouchesDate, fromDateKey, monthGrid, toDateKey, toTimeInput,
} from './agendaUtils';

import { agendaServerFieldErrors, suggestAgendaEnd, validateAgendaSchedule, type AgendaFieldErrors, type AgendaScheduleField } from './agendaDateTime';

type UseAgendaControllerOptions = { session: AuthSession; isMedical: boolean };

export function useAgendaController({ session, isMedical }: UseAgendaControllerOptions) {
  const { confirmAction, confirmationDialog } = useConfirmationDialog();
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState(() => fromDateKey(todayKey));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [activeSection, setActiveSection] = useState<AgendaSection>('calendario');
  const [view, setView] = useState<AgendaView>('month');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [responsibility, setResponsibility] = useState('all');
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  const filters: AgendaEventFilters = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status !== 'all' ? { isCompleted: status === 'completed' } : {}),
    ...(responsibility === 'mine' ? { userId: session.user.id } : {}),
  };
  const range = agendaRange(view, visibleMonth, selectedDate);
  const { events, loading, eventsError, loadEvents, invalidateEvents } = useAgendaEvents(session, range.from, range.to, filters);
  const { medicalUsers, notificationRecipientOptions, notificationRecipientsLoading, notificationRecipientsError, recipientSearch } = useAgendaRecipients(session);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [holidayError, setHolidayError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AgendaFormData>(() => buildEmptyForm(todayKey, isMedical, session.user.id));

  const manualEnd = useRef(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState<AgendaFieldErrors>({});
  const fieldErrors = { ...(validationAttempted ? validateAgendaSchedule(formData) : {}), ...serverFieldErrors };
  const changeScheduleField = (field: AgendaScheduleField, value: string) => {
    if (field === 'endDate' || field === 'endTime') manualEnd.current = true;
    setServerFieldErrors({});
    const canSuggest = !editingEventId && !manualEnd.current && (field === 'startDate' || field === 'startTime');
    setFormData(current => {
      const next = { ...current, [field]: value };
      return canSuggest ? { ...next, ...suggestAgendaEnd(next.startDate, next.startTime) } : next;
    });
  };

  const days = useMemo(() => monthGrid(visibleMonth), [visibleMonth]);
  const holidayByDate = useMemo(() => new Map(holidays.filter((holiday) => holiday.global || holiday.types?.includes('Public'))
    .map((holiday) => [holiday.date, holiday])), [holidays]);
  const selectedHoliday = holidayByDate.get(selectedDate);
  const selectedEvents = useMemo(() => events.filter((event) => eventTouchesDate(event, selectedDate))
    .sort((first, second) => new Date(first.start).getTime() - new Date(second.start).getTime()), [events, selectedDate]);
  const pendingEventsCount = events.filter((event) => !event.isCompleted).length;

  useEffect(() => {
    const years = Array.from(new Set(days.map((date) => date.getFullYear())));
    setHolidayLoading(true); setHolidayError('');
    void Promise.all(years.map((year) => getBrazilPublicHolidays(year))).then((result) => setHolidays(result.flat()))
      .catch((caughtError) => setHolidayError(getErrorMessage(caughtError))).finally(() => setHolidayLoading(false));
  }, [days]);
  const resetForm = (dateKey = selectedDate) => { manualEnd.current = false; setValidationAttempted(false); setServerFieldErrors({}); setEditingEventId(null); setFormData(buildEmptyForm(dateKey, isMedical, session.user.id)); };
  const openCalendarSection = () => setActiveSection('calendario');
  const openCadastroSection = () => setActiveSection('cadastro');
  const handleSelectDate = (date: Date) => {
    const dateKey = toDateKey(date); setSelectedDate(dateKey);
    if (date.getMonth() !== visibleMonth.getMonth() || date.getFullYear() !== visibleMonth.getFullYear())
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    if (!editingEventId) changeScheduleField('startDate', dateKey);
  };
  const moveMonth = (offset: number) => {
    const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(date); setSelectedDate(toDateKey(date));
  };
  const movePeriod = (offset: number) => {
    if (view !== 'week') { moveMonth(offset); return; }
    const date = fromDateKey(selectedDate); date.setDate(date.getDate() + offset * 7); handleSelectDate(date);
  };
  const handlePreviousMonth = () => movePeriod(-1);
  const handleNextMonth = () => movePeriod(1);
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
    setValidationAttempted(true); setServerFieldErrors({});
    if (Object.keys(validateAgendaSchedule(formData)).length > 0) {
      const form = event.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const hasNotificationMessage = formData.notificationMessage.trim().length > 0;
    const hasNotificationRecipients = formData.notifyAllAllowedRecipients || formData.notificationUserIds.length > 0 || formData.notificationGroupIds.length > 0;
    if (hasNotificationRecipients && !hasNotificationMessage) { setError('Informe a mensagem da notificação.'); return; }
    if (hasNotificationMessage && !hasNotificationRecipients) { setError('Selecione ao menos um destinatário para enviar a notificação.'); return; }
    setFormLoading(true);
    try {
      const savedEvent = editingEventId ? await updateAgendaEvent(editingEventId, buildPayload(), session.token) : await createAgendaEvent(buildPayload(), session.token);
      invalidateEvents(); setSuccessMessage(editingEventId ? 'Evento atualizado.' : 'Evento cadastrado.');
      const savedDate = new Date(savedEvent.start); const savedDateKey = toDateKey(savedDate);
      setSelectedDate(savedDateKey); setVisibleMonth(new Date(savedDate.getFullYear(), savedDate.getMonth(), 1)); resetForm(savedDateKey);
      setActiveSection('calendario');
    } catch (caughtError) {
      const errors = agendaServerFieldErrors(caughtError);
      if (Object.keys(errors).length) setServerFieldErrors(errors);
      else setError(getErrorMessage(caughtError));
    }
    finally { setFormLoading(false); }
  };
  const handleEdit = (agendaEvent: AgendaEvent) => {
    manualEnd.current = true; setValidationAttempted(false); setServerFieldErrors({});
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
    try { await deleteAgendaEvent(eventId, session.token);
      setSuccessMessage('Evento excluido.'); if (editingEventId === eventId) resetForm(); await loadEvents(); }
    catch (caughtError) { setError(getErrorMessage(caughtError)); }
  };
  const handleDelete = (agendaEvent: AgendaEvent) => confirmAction({ tone: 'delete', title: 'Excluir evento?',
    message: `Deseja excluir "${agendaEvent.title}"? Esta ação não poderá ser desfeita.`, confirmLabel: 'Sim', cancelLabel: 'Não', onConfirm: () => deleteSelectedEvent(agendaEvent) });

  return { view, setView, search, setSearch, status, setStatus, responsibility, setResponsibility, range, todayKey, visibleMonth, selectedDate, activeSection, events, medicalUsers, notificationRecipientOptions,
    notificationRecipientsLoading, notificationRecipientsError, recipientSearch, loading, holidayLoading, formLoading, error: error || eventsError, holidayError,
    successMessage, editingEventId, formData, setFormData, fieldErrors, changeScheduleField, days, holidayByDate, selectedHoliday, selectedEvents, pendingEventsCount,
    loadEvents, openCalendarSection, openCadastroSection, handleSelectDate, handlePreviousMonth, handleNextMonth, handleToday,
    resetForm, toggleNotificationUser, toggleNotificationGroup, openDraftForSelectedDate, handleSubmit, handleEdit, handleComplete,
    handleDelete, confirmationDialog };
}
