import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import './events.css';
import {
  completeAgendaEvent,
  createAgendaEvent,
  deleteAgendaEvent,
  getAgendaEvents,
  getAgendaMedicalUsers,
  getAgendaNotificationRecipientOptions,
  getBrazilPublicHolidays,
  updateAgendaEvent,
} from '../../services';
import type {
  AgendaEvent,
  AgendaEventPayload,
  AgendaMedicalUser,
  AgendaNotificationRecipientOptions,
  AuthSession,
  PublicHoliday,
} from '../../types';
import { getErrorMessage } from '../../shared/utils/formatters';
import { useConfirmationDialog } from '../../shared/components/ConfirmationDialog';
import { AlertMessage, Button, DataPanel, IconButton } from '../../shared/components/ui';
import { AgendaCalendarSection } from './AgendaCalendarSection';
import { AgendaEventForm } from './AgendaEventForm';
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

type AgendaPageProps = {
  session: AuthSession;
  isAdmin: boolean;
  isMedical: boolean;
};

export { buildEmptyForm } from './agendaUtils';

export function AgendaPage({ session, isAdmin, isMedical }: AgendaPageProps) {
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
  const holidayByDate = useMemo(() => new Map(
    holidays
      .filter((holiday) => holiday.global || holiday.types?.includes('Public'))
      .map((holiday) => [holiday.date, holiday]),
  ), [holidays]);
  const selectedHoliday = holidayByDate.get(selectedDate);
  const selectedEvents = useMemo(
    () => events
      .filter((event) => eventTouchesDate(event, selectedDate))
      .sort((first, second) => new Date(first.start).getTime() - new Date(second.start).getTime()),
    [events, selectedDate],
  );
  const pendingEventsCount = events.filter((event) => !event.isCompleted).length;

  const loadEvents = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getAgendaEvents(
        session.token,
        firstGridDate.toISOString(),
        lastGridDate.toISOString(),
      );
      setEvents(result);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, [session.token, firstGridDate.toISOString(), lastGridDate.toISOString()]);

  useEffect(() => {
    const years = Array.from(new Set(days.map((date) => date.getFullYear())));
    setHolidayLoading(true);
    setHolidayError('');

    void Promise.all(years.map((year) => getBrazilPublicHolidays(year)))
      .then((result) => setHolidays(result.flat()))
      .catch((caughtError) => setHolidayError(getErrorMessage(caughtError)))
      .finally(() => setHolidayLoading(false));
  }, [days]);

  useEffect(() => {
    void getAgendaMedicalUsers(session.token)
      .then(setMedicalUsers)
      .catch((caughtError) => setError(getErrorMessage(caughtError)));
  }, [session.token]);

  useEffect(() => {
    setNotificationRecipientsLoading(true);
    setNotificationRecipientsError('');

    void getAgendaNotificationRecipientOptions(session.token)
      .then((options) => {
        setNotificationRecipientOptions(options);
        setNotificationRecipientsError('');
      })
      .catch((caughtError) => {
        const message = getErrorMessage(caughtError);

        setNotificationRecipientOptions(null);
        setNotificationRecipientsError(message);
        setError(message);
      })
      .finally(() => setNotificationRecipientsLoading(false));
  }, [session.token]);

  const resetForm = (dateKey = selectedDate) => {
    setEditingEventId(null);
    setFormData(buildEmptyForm(dateKey, isMedical, session.user.id));
  };

  const openCalendarSection = () => {
    setActiveSection('calendario');
  };

  const openCadastroSection = () => {
    setActiveSection('cadastro');
  };

  const handleSelectDate = (date: Date) => {
    const dateKey = toDateKey(date);
    setSelectedDate(dateKey);

    if (!editingEventId) {
      setFormData((current) => ({
        ...current,
        startDate: dateKey,
        endDate: dateKey,
      }));
    }
  };

  const handlePreviousMonth = () => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = fromDateKey(todayKey);
    setActiveSection('calendario');
    setVisibleMonth(today);
    setSelectedDate(todayKey);
    resetForm(todayKey);
  };

  const buildPayload = (): AgendaEventPayload => {
    const start = composeDateTime(formData.startDate, formData.startTime);
    const end = composeDateTime(formData.endDate, formData.endTime);
    const reminderPeriod = formData.notifyUser || formData.notifyMedicalProfile
      ? Number(formData.reminderPeriodMinutes || defaultReminderMinutes)
      : null;

    return {
      medicalUserId: formData.notifyMedicalProfile && formData.medicalUserId ? Number(formData.medicalUserId) : null,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      start: start.toISOString(),
      end: end.toISOString(),
      notifyMedicalProfile: formData.notifyMedicalProfile,
      notifyUser: formData.notifyUser,
      reminderPeriodMinutes: reminderPeriod,
      notificationMessage: formData.notificationMessage.trim() || null,
      notifyAllAllowedRecipients: formData.notifyAllAllowedRecipients,
      notificationUserIds: formData.notificationUserIds,
      notificationGroupIds: formData.notificationGroupIds,
    };
  };

  const toggleNotificationUser = (userId: number) => {
    setFormData((current) => {
      const hasUser = current.notificationUserIds.includes(userId);
      return {
        ...current,
        notificationUserIds: hasUser
          ? current.notificationUserIds.filter((id) => id !== userId)
          : [...current.notificationUserIds, userId],
      };
    });
  };

  const toggleNotificationGroup = (groupId: number) => {
    setFormData((current) => {
      const hasGroup = current.notificationGroupIds.includes(groupId);
      return {
        ...current,
        notificationGroupIds: hasGroup
          ? current.notificationGroupIds.filter((id) => id !== groupId)
          : [...current.notificationGroupIds, groupId],
      };
    });
  };

  const openDraftForSelectedDate = () => {
    setEditingEventId(null);
    setFormData(buildEmptyForm(selectedDate, isMedical, session.user.id));
    openCadastroSection();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!formData.title.trim()) {
      setError('Informe o titulo do evento.');
      return;
    }

    if (composeDateTime(formData.endDate, formData.endTime) <= composeDateTime(formData.startDate, formData.startTime)) {
      setError('A data final deve ser maior que a inicial.');
      return;
    }

    const hasNotificationMessage = formData.notificationMessage.trim().length > 0;
    const hasNotificationRecipients = formData.notifyAllAllowedRecipients
      || formData.notificationUserIds.length > 0
      || formData.notificationGroupIds.length > 0;

    if (hasNotificationRecipients && !hasNotificationMessage) {
      setError('Informe a mensagem da notificação.');
      return;
    }

    if (hasNotificationMessage && !hasNotificationRecipients) {
      setError('Selecione ao menos um destinatário para enviar a notificação.');
      return;
    }

    setFormLoading(true);

    try {
      const payload = buildPayload();
      const savedEvent = editingEventId
        ? await updateAgendaEvent(editingEventId, payload, session.token)
        : await createAgendaEvent(payload, session.token);

      setEvents((current) => mergeAgendaEvent(current, savedEvent));
      setSuccessMessage(editingEventId ? 'Evento atualizado.' : 'Evento cadastrado.');
      setSelectedDate(toDateKey(new Date(savedEvent.start)));
      setVisibleMonth(new Date(new Date(savedEvent.start).getFullYear(), new Date(savedEvent.start).getMonth(), 1));
      resetForm(toDateKey(new Date(savedEvent.start)));
      setActiveSection('calendario');
      void loadEvents();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setFormLoading(false);
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
      await completeAgendaEvent(agendaEvent.id, session.token);
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
    const eventId = agendaEvent.id;

    setError('');
    setSuccessMessage('');

    try {
      await deleteAgendaEvent(eventId, session.token);
      setEvents((current) => current.filter((event) => event.id !== eventId));
      setSuccessMessage('Evento excluido.');
      if (editingEventId === eventId) {
        resetForm();
      }
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

  return (
    <section className="workspace agenda-workspace">
      <DataPanel className="agenda-panel">
        <div className="data-header agenda-header">
          <div>
            <span className="eyebrow">Agenda e notificações</span>
            <h2>Agenda e notificações</h2>
            <span className="agenda-subtitle">{pendingEventsCount} eventos ativos</span>
          </div>
          <div className="table-tools agenda-tools">
            <Button
              type="button"
              variant="ghost"
              className={`agenda-section-tab ${activeSection === 'calendario' ? 'is-active' : ''}`}
              onClick={openCalendarSection}
              aria-pressed={activeSection === 'calendario'}
            >
              <CalendarDays size={17} />
              Calendário
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={`agenda-section-tab agenda-new-event-button ${activeSection === 'cadastro' ? 'is-active' : ''}`}
              onClick={openCadastroSection}
              aria-pressed={activeSection === 'cadastro'}
            >
              <Plus size={17} />
              Novo evento
            </Button>
            <Button onClick={handleToday}>
              <CalendarDays size={17} />
              Hoje
            </Button>
            <IconButton label="Atualizar agenda" onClick={() => void loadEvents()}>
              <RefreshCw size={18} />
            </IconButton>
          </div>
        </div>

        {successMessage && <AlertMessage type="success" icon={<CheckCircle2 size={17} />}>{successMessage}</AlertMessage>}
        {error && <AlertMessage type="error">{error}</AlertMessage>}
        {holidayError && <AlertMessage type="warning">{holidayError}</AlertMessage>}

        {activeSection === 'calendario' ? (
          <AgendaCalendarSection
            visibleMonth={visibleMonth}
            days={days}
            events={events}
            selectedDate={selectedDate}
            selectedEvents={selectedEvents}
            selectedHoliday={selectedHoliday}
            holidayByDate={holidayByDate}
            todayKey={todayKey}
            loading={loading}
            holidayLoading={holidayLoading}
            isAdmin={isAdmin}
            currentUserId={session.user.id}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
            onSelectDate={handleSelectDate}
            onOpenDraftForSelectedDate={openDraftForSelectedDate}
            onComplete={handleComplete}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <AgendaEventForm
            editingEventId={editingEventId}
            formData={formData}
            formLoading={formLoading}
            medicalUsers={medicalUsers}
            notificationRecipientOptions={notificationRecipientOptions}
            notificationRecipientsLoading={notificationRecipientsLoading}
            notificationRecipientsError={notificationRecipientsError}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onOpenCalendarSection={openCalendarSection}
            onResetForm={() => resetForm()}
            onToggleNotificationUser={toggleNotificationUser}
            onToggleNotificationGroup={toggleNotificationGroup}
          />
        )}
      </DataPanel>
      {confirmationDialog}
    </section>
  );
}
