import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  completeAgendaEvent,
  createAgendaEvent,
  deleteAgendaEvent,
  getAgendaEvents,
  getAgendaMedicalUsers,
  getAgendaNotificationRecipientOptions,
  getBrazilPublicHolidays,
  updateAgendaEvent,
} from '../../api';
import type {
  AgendaEvent,
  AgendaEventPayload,
  AgendaMedicalUser,
  AgendaNotificationRecipientOptions,
  AuthSession,
  PublicHoliday,
} from '../../types';
import { getErrorMessage } from '../../shared/utils/formatters';
import { AlertMessage, Button, CheckboxField, DataPanel, FormPanel, IconButton, SelectField, TextField, TextareaField } from '../../shared/components/ui';

type AgendaPageProps = {
  session: AuthSession;
  isAdmin: boolean;
  isMedical: boolean;
};

type AgendaFormData = {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  notifyMedicalProfile: boolean;
  medicalUserId: string;
  notifyUser: boolean;
  reminderPeriodMinutes: string;
  notificationMessage: string;
  notifyAllAllowedRecipients: boolean;
  notificationUserIds: number[];
  notificationGroupIds: number[];
};

type AgendaFormTab = 'evento' | 'notificacoes';
type AgendaSection = 'calendario' | 'cadastro';

const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const defaultReminderMinutes = '1440';

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function monthTitle(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function toTimeInput(date: Date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function buildEmptyForm(dateKey = toDateKey(new Date()), isMedical = false, userId?: number): AgendaFormData {
  const now = new Date();
  const start = toDateKey(now) === dateKey ? new Date(now.getTime() + 60 * 60 * 1000) : new Date(`${dateKey}T09:00:00`);
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return {
    title: '',
    description: '',
    startDate: dateKey,
    startTime: toTimeInput(start),
    endDate: dateKey,
    endTime: toTimeInput(end),
    notifyMedicalProfile: false,
    medicalUserId: isMedical && userId ? String(userId) : '',
    notifyUser: true,
    reminderPeriodMinutes: defaultReminderMinutes,
    notificationMessage: '',
    notifyAllAllowedRecipients: false,
    notificationUserIds: [],
    notificationGroupIds: [],
  };
}

function monthGrid(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function eventTouchesDate(event: AgendaEvent, dateKey: string) {
  const startKey = toDateKey(new Date(event.start));
  const endKey = toDateKey(new Date(event.end));
  return startKey <= dateKey && endKey >= dateKey;
}

function composeDateTime(dateKey: string, timeValue: string) {
  return new Date(`${dateKey}T${timeValue || '00:00'}:00`);
}

function getHolidayTitle(holiday?: PublicHoliday) {
  if (!holiday) {
    return '';
  }

  return holiday.localName || holiday.name;
}

export function AgendaPage({ session, isAdmin, isMedical }: AgendaPageProps) {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState(() => fromDateKey(todayKey));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [activeSection, setActiveSection] = useState<AgendaSection>('calendario');
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [medicalUsers, setMedicalUsers] = useState<AgendaMedicalUser[]>([]);
  const [notificationRecipientOptions, setNotificationRecipientOptions] = useState<AgendaNotificationRecipientOptions | null>(null);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(false);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<AgendaFormTab>('evento');
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
    void getAgendaNotificationRecipientOptions(session.token)
      .then(setNotificationRecipientOptions)
      .catch((caughtError) => setError(getErrorMessage(caughtError)));
  }, [session.token]);

  const resetForm = (dateKey = selectedDate) => {
    setEditingEventId(null);
    setActiveFormTab('evento');
    setFormData(buildEmptyForm(dateKey, isMedical, session.user.id));
  };

  const openCalendarSection = () => {
    setActiveSection('calendario');
  };

  const openCadastroSection = (tab: AgendaFormTab = 'evento') => {
    setActiveSection('cadastro');
    setActiveFormTab(tab);
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

  const openDraftForSelectedDate = (tab: AgendaFormTab) => {
    setEditingEventId(null);
    setFormData(buildEmptyForm(selectedDate, isMedical, session.user.id));
    openCadastroSection(tab);
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
      setError('Informe a mensagem da notificacao.');
      return;
    }

    if (hasNotificationMessage && !hasNotificationRecipients) {
      setError('Selecione ao menos um destinatario para enviar a notificacao.');
      return;
    }

    setFormLoading(true);

    try {
      const payload = buildPayload();
      const savedEvent = editingEventId
        ? await updateAgendaEvent(editingEventId, payload, session.token)
        : await createAgendaEvent(payload, session.token);

      setSuccessMessage(editingEventId ? 'Evento atualizado.' : 'Evento cadastrado.');
      setSelectedDate(toDateKey(new Date(savedEvent.start)));
      setVisibleMonth(new Date(new Date(savedEvent.start).getFullYear(), new Date(savedEvent.start).getMonth(), 1));
      resetForm(toDateKey(new Date(savedEvent.start)));
      setActiveSection('calendario');
      await loadEvents();
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
    setActiveFormTab('evento');
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

  const handleComplete = async (agendaEvent: AgendaEvent) => {
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

  const handleDelete = async (agendaEvent: AgendaEvent) => {
    if (!window.confirm(`Excluir ${agendaEvent.title}?`)) {
      return;
    }

    setError('');
    setSuccessMessage('');

    try {
      await deleteAgendaEvent(agendaEvent.id, session.token);
      setSuccessMessage('Evento excluido.');
      if (editingEventId === agendaEvent.id) {
        resetForm();
      }
      await loadEvents();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  };

  return (
    <section className="workspace agenda-workspace">
      <DataPanel className="agenda-panel">
        <div className="data-header agenda-header">
          <div>
            <span className="eyebrow">Agenda e notificacoes</span>
            <h2>Agenda e notificacoes</h2>
            <span className="agenda-subtitle">{pendingEventsCount} eventos ativos</span>
          </div>
          <div className="table-tools agenda-tools">
            <Button
              type="button"
              variant={activeSection === 'calendario' ? 'primary' : 'ghost'}
              onClick={openCalendarSection}
            >
              <CalendarDays size={17} />
              Calendario
            </Button>
            <Button
              type="button"
              variant={activeSection === 'cadastro' ? 'primary' : 'ghost'}
              onClick={() => openCadastroSection(editingEventId ? activeFormTab : 'evento')}
            >
              <MessageSquareText size={17} />
              Cadastro
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
          <>
            <div className="agenda-monthbar">
              <IconButton label="Mes anterior" onClick={handlePreviousMonth}>
                <ChevronLeft size={18} />
              </IconButton>
              <strong>{monthTitle(visibleMonth)}</strong>
              <IconButton label="Proximo mes" onClick={handleNextMonth}>
                <ChevronRight size={18} />
              </IconButton>
            </div>

            <div className="agenda-calendar" aria-busy={loading || holidayLoading}>
              {weekdayLabels.map((label) => (
                <span className="agenda-weekday" key={label}>{label}</span>
              ))}
              {days.map((date) => {
                const dateKey = toDateKey(date);
                const holiday = holidayByDate.get(dateKey);
                const dayEvents = events.filter((agendaEvent) => eventTouchesDate(agendaEvent, dateKey));
                const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDate;

                return (
                  <button
                    type="button"
                    key={dateKey}
                    className={[
                      'agenda-day',
                      isCurrentMonth ? '' : 'muted',
                      isToday ? 'today' : '',
                      isSelected ? 'selected' : '',
                      holiday ? 'holiday' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleSelectDate(date)}
                    title={getHolidayTitle(holiday)}
                  >
                    <span className="agenda-day-number">{date.getDate()}</span>
                    {holiday && <span className="agenda-holiday-dot">{getHolidayTitle(holiday)}</span>}
                    {dayEvents.length > 0 && (
                      <span className="agenda-event-count">
                        {dayEvents.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="agenda-selected">
              <div className="agenda-selected-title">
                <span>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(fromDateKey(selectedDate))}</span>
                {selectedHoliday && <strong>{getHolidayTitle(selectedHoliday)}</strong>}
              </div>

              <div className="agenda-day-actions">
                <div className="agenda-day-actions-copy">
                  <strong>Adicionar neste dia</strong>
                  <span>Clique para criar um evento ou uma notificacao com a data ja preenchida.</span>
                </div>
                <div className="agenda-day-actions-buttons">
                  <Button type="button" variant="ghost" onClick={() => openDraftForSelectedDate('evento')}>
                    <Plus size={17} />
                    Novo evento
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => openDraftForSelectedDate('notificacoes')}>
                    <MessageSquareText size={17} />
                    Nova notificacao
                  </Button>
                </div>
              </div>

              <div className="agenda-event-list">
                {loading ? (
                  <p className="agenda-empty">Carregando eventos...</p>
                ) : selectedEvents.length ? (
                  selectedEvents.map((agendaEvent) => {
                    const canManage = isAdmin || agendaEvent.userId === session.user.id;

                    return (
                      <article className={`agenda-event-item ${agendaEvent.isCompleted ? 'completed' : ''}`} key={agendaEvent.id}>
                        <div className="agenda-event-main">
                          <span className="agenda-event-time">
                            <Clock size={15} />
                            {formatDateTime(agendaEvent.start)} - {formatDateTime(agendaEvent.end)}
                          </span>
                          <strong>{agendaEvent.title}</strong>
                          {agendaEvent.description && <p>{agendaEvent.description}</p>}
                          <div className="agenda-event-meta">
                            {agendaEvent.notifyUser && <span><Bell size={14} /> Usuario</span>}
                            {agendaEvent.notifyMedicalProfile && <span><Bell size={14} /> {agendaEvent.medicalUserName || 'Perfil medico'}</span>}
                            {agendaEvent.isCompleted && <span><Check size={14} /> Concluido</span>}
                          </div>
                        </div>
                        {canManage && (
                          <div className="agenda-event-actions">
                            {!agendaEvent.isCompleted && (
                              <IconButton label="Concluir" tone="muted" onClick={() => void handleComplete(agendaEvent)}>
                                <Check size={17} />
                              </IconButton>
                            )}
                            <IconButton label="Editar" tone="muted" onClick={() => handleEdit(agendaEvent)}>
                              <Pencil size={17} />
                            </IconButton>
                            <IconButton label="Excluir" tone="danger" onClick={() => void handleDelete(agendaEvent)}>
                              <Trash2 size={17} />
                            </IconButton>
                          </div>
                        )}
                      </article>
                    );
                  })
                ) : (
                  <p className="agenda-empty">Nenhum evento nesta data.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <FormPanel className="agenda-form-panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">{editingEventId ? 'Edicao' : 'Cadastro'}</span>
                <h2>{editingEventId ? 'Editar evento' : 'Novo evento'}</h2>
                <span className="agenda-form-context">
                  {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(fromDateKey(selectedDate))}
                </span>
              </div>
              <div className="agenda-panel-actions">
                <Button
                  type="button"
                  variant={activeFormTab === 'evento' ? 'primary' : 'ghost'}
                  onClick={() => setActiveFormTab('evento')}
                >
                  <CalendarDays size={17} />
                  Evento
                </Button>
                <Button
                  type="button"
                  variant={activeFormTab === 'notificacoes' ? 'primary' : 'ghost'}
                  onClick={() => setActiveFormTab('notificacoes')}
                >
                  <MessageSquareText size={17} />
                  Notificacoes
                </Button>
                <Button type="button" variant="ghost" onClick={openCalendarSection}>
                  <ChevronLeft size={17} />
                  Calendario
                </Button>
                {editingEventId && (
                  <IconButton label="Cancelar edicao" tone="muted" onClick={() => resetForm()}>
                    <X size={18} />
                  </IconButton>
                )}
              </div>
            </div>

            <form className="stack agenda-form" onSubmit={handleSubmit}>
              {activeFormTab === 'evento' ? (
                <div className="agenda-form-section">
                  <TextField
                    label="Titulo"
                    type="text"
                    value={formData.title}
                    onValueChange={(value) => setFormData((current) => ({ ...current, title: value.slice(0, 255) }))}
                    maxLength={255}
                    required
                  />

                  <TextField
                    label="Descricao"
                    type="text"
                    value={formData.description}
                    onValueChange={(value) => setFormData((current) => ({ ...current, description: value.slice(0, 2000) }))}
                    maxLength={2000}
                  />

                  <div className="two-column-fields">
                    <TextField
                      label="Inicio"
                      type="date"
                      value={formData.startDate}
                      onValueChange={(value) => setFormData((current) => ({ ...current, startDate: value }))}
                      required
                    />
                    <TextField
                      label="Hora"
                      type="time"
                      value={formData.startTime}
                      onValueChange={(value) => setFormData((current) => ({ ...current, startTime: value }))}
                      required
                    />
                  </div>

                  <div className="two-column-fields">
                    <TextField
                      label="Termino"
                      type="date"
                      value={formData.endDate}
                      onValueChange={(value) => setFormData((current) => ({ ...current, endDate: value }))}
                      required
                    />
                    <TextField
                      label="Hora"
                      type="time"
                      value={formData.endTime}
                      onValueChange={(value) => setFormData((current) => ({ ...current, endTime: value }))}
                      required
                    />
                  </div>

                  <CheckboxField
                    label="Notificar perfil medico"
                    checked={formData.notifyMedicalProfile}
                    onCheckedChange={(checked) => setFormData((current) => ({ ...current, notifyMedicalProfile: checked }))}
                  />

                  {formData.notifyMedicalProfile && (
                    <SelectField
                      label="Medico"
                      value={formData.medicalUserId}
                      onChange={(event) => setFormData((current) => ({ ...current, medicalUserId: event.target.value }))}
                    >
                      <option value="">Perfil medico</option>
                      {medicalUsers.map((user) => (
                        <option key={user.id} value={user.id}>{user.nome}</option>
                      ))}
                    </SelectField>
                  )}

                  <CheckboxField
                    label="Receber lembretes"
                    checked={formData.notifyUser}
                    onCheckedChange={(checked) => setFormData((current) => ({ ...current, notifyUser: checked }))}
                  />

                  {(formData.notifyUser || formData.notifyMedicalProfile) && (
                    <SelectField
                      label="Intervalo de lembretes"
                      value={formData.reminderPeriodMinutes}
                      onChange={(event) => setFormData((current) => ({ ...current, reminderPeriodMinutes: event.target.value }))}
                    >
                      <option value="60">A cada 1 hora</option>
                      <option value="360">A cada 6 horas</option>
                      <option value="720">A cada 12 horas</option>
                      <option value="1440">A cada 1 dia</option>
                      <option value="2880">A cada 2 dias</option>
                    </SelectField>
                  )}
                </div>
              ) : (
                <div className="agenda-form-section agenda-notification-section agenda-notification-section-compact">
                  <div className="agenda-notification-header">
                    <div>
                      <span className="eyebrow">Notificacoes da agenda</span>
                      <strong>Mensagem e destinatarios</strong>
                    </div>
                    <span className="agenda-notification-hint">
                      Maximo de 500 caracteres
                    </span>
                  </div>

                  <TextareaField
                    label="Mensagem da notificacao"
                    value={formData.notificationMessage}
                    onValueChange={(value) => setFormData((current) => ({ ...current, notificationMessage: value.slice(0, 500) }))}
                    maxLength={500}
                    placeholder="Explique a reuniao, evento, auditoria ou videoconferencia."
                    className="agenda-notification-message"
                  />

                  {notificationRecipientOptions ? (
                    <>
                      <CheckboxField
                        label={notificationRecipientOptions.allRecipientsLabel}
                        checked={formData.notifyAllAllowedRecipients}
                        onCheckedChange={(checked) => setFormData((current) => ({ ...current, notifyAllAllowedRecipients: checked }))}
                      />

                      {notificationRecipientOptions.users.length > 0 && (
                        <div className="agenda-recipient-group">
                          <strong>Destinatarios individuais</strong>
                          <div className="agenda-recipient-list">
                            {notificationRecipientOptions.users.map((user) => (
                              <CheckboxField
                                key={user.id}
                                label={`${user.nome} (${user.perfilNome})`}
                                checked={formData.notificationUserIds.includes(user.id)}
                                onCheckedChange={() => toggleNotificationUser(user.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {notificationRecipientOptions.groups.length > 0 && (
                        <div className="agenda-recipient-group">
                          <strong>Grupos medicos</strong>
                          <div className="agenda-recipient-list">
                            {notificationRecipientOptions.groups.map((group) => (
                              <CheckboxField
                                key={group.id}
                                label={`${group.nome} (${group.membrosCount})`}
                                checked={formData.notificationGroupIds.includes(group.id)}
                                onCheckedChange={() => toggleNotificationGroup(group.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="agenda-empty">Carregando destinatarios disponiveis...</p>
                  )}
                </div>
              )}

              <div className="agenda-form-summary">
                {activeFormTab === 'evento' ? (
                  <Button type="button" variant="ghost" onClick={() => setActiveFormTab('notificacoes')}>
                    <MessageSquareText size={17} />
                    Configurar notificacao
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" onClick={() => setActiveFormTab('evento')}>
                    <CalendarDays size={17} />
                    Voltar ao evento
                  </Button>
                )}
                <span className="agenda-form-summary-text">
                  {activeFormTab === 'evento'
                    ? 'A aba de notificacoes fica separada do calendario para evitar rolagem longa.'
                    : 'As notificacoes sao enviadas junto com o evento, mas configuradas nesta tela.'}
                </span>
              </div>

              <Button variant="primary" type="submit" disabled={formLoading}>
                {editingEventId ? <Save size={18} /> : <Plus size={18} />}
                {formLoading ? 'Salvando...' : editingEventId ? 'Salvar evento' : 'Cadastrar evento'}
              </Button>
            </form>
          </FormPanel>
        )}
      </DataPanel>
    </section>
  );
}
