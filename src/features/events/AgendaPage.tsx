import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
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
  getBrazilPublicHolidays,
  updateAgendaEvent,
} from '../../api';
import type { AgendaEvent, AgendaEventPayload, AgendaMedicalUser, AuthSession, PublicHoliday } from '../../types';
import { getErrorMessage } from '../../shared/utils/formatters';

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
};

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
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [medicalUsers, setMedicalUsers] = useState<AgendaMedicalUser[]>([]);
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

  const resetForm = (dateKey = selectedDate) => {
    setEditingEventId(null);
    setFormData(buildEmptyForm(dateKey, isMedical, session.user.id));
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

    if (composeDateTime(formData.endDate, formData.endTime) <= composeDateTime(formData.startDate, formData.startTime)) {
      setError('A data final deve ser maior que a inicial.');
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
      <section className="data-panel agenda-panel">
        <div className="data-header agenda-header">
          <div>
            <span className="eyebrow">Agenda</span>
            <h2>{pendingEventsCount} eventos ativos</h2>
          </div>
          <div className="table-tools agenda-tools">
            <button type="button" className="ghost-button" onClick={handleToday}>
              <CalendarDays size={17} />
              Hoje
            </button>
            <button type="button" className="icon-button" onClick={() => void loadEvents()} title="Atualizar agenda">
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {successMessage && <p className="alert success"><CheckCircle2 size={17} />{successMessage}</p>}
        {error && <p className="alert error">{error}</p>}
        {holidayError && <p className="alert warning">{holidayError}</p>}

        <div className="agenda-monthbar">
          <button type="button" className="icon-button" onClick={handlePreviousMonth} title="Mes anterior">
            <ChevronLeft size={18} />
          </button>
          <strong>{monthTitle(visibleMonth)}</strong>
          <button type="button" className="icon-button" onClick={handleNextMonth} title="Proximo mes">
            <ChevronRight size={18} />
          </button>
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
                          <button type="button" className="icon-button muted" onClick={() => void handleComplete(agendaEvent)} title="Concluir">
                            <Check size={17} />
                          </button>
                        )}
                        <button type="button" className="icon-button muted" onClick={() => handleEdit(agendaEvent)} title="Editar">
                          <Pencil size={17} />
                        </button>
                        <button type="button" className="icon-button danger" onClick={() => void handleDelete(agendaEvent)} title="Excluir">
                          <Trash2 size={17} />
                        </button>
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
      </section>

      <aside className="form-panel agenda-form-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{editingEventId ? 'Edicao' : 'Cadastro'}</span>
            <h2>{editingEventId ? 'Editar evento' : 'Novo evento'}</h2>
          </div>
          {editingEventId && (
            <button type="button" className="icon-button muted" onClick={() => resetForm()} title="Cancelar edicao">
              <X size={18} />
            </button>
          )}
        </div>

        <form className="stack agenda-form" onSubmit={handleSubmit}>
          <label>
            Titulo
            <input
              type="text"
              value={formData.title}
              onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value.slice(0, 255) }))}
              maxLength={255}
              required
            />
          </label>

          <label>
            Descricao
            <input
              type="text"
              value={formData.description}
              onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value.slice(0, 2000) }))}
              maxLength={2000}
            />
          </label>

          <div className="two-column-fields">
            <label>
              Inicio
              <input
                type="date"
                value={formData.startDate}
                onChange={(event) => setFormData((current) => ({ ...current, startDate: event.target.value }))}
                required
              />
            </label>
            <label>
              Hora
              <input
                type="time"
                value={formData.startTime}
                onChange={(event) => setFormData((current) => ({ ...current, startTime: event.target.value }))}
                required
              />
            </label>
          </div>

          <div className="two-column-fields">
            <label>
              Termino
              <input
                type="date"
                value={formData.endDate}
                onChange={(event) => setFormData((current) => ({ ...current, endDate: event.target.value }))}
                required
              />
            </label>
            <label>
              Hora
              <input
                type="time"
                value={formData.endTime}
                onChange={(event) => setFormData((current) => ({ ...current, endTime: event.target.value }))}
                required
              />
            </label>
          </div>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={formData.notifyMedicalProfile}
              onChange={(event) => setFormData((current) => ({ ...current, notifyMedicalProfile: event.target.checked }))}
            />
            Notificar perfil medico
          </label>

          {formData.notifyMedicalProfile && (
            <label>
              Medico
              <select
                value={formData.medicalUserId}
                onChange={(event) => setFormData((current) => ({ ...current, medicalUserId: event.target.value }))}
              >
                <option value="">Perfil medico</option>
                {medicalUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.nome}</option>
                ))}
              </select>
            </label>
          )}

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={formData.notifyUser}
              onChange={(event) => setFormData((current) => ({ ...current, notifyUser: event.target.checked }))}
            />
            Receber lembretes
          </label>

          {(formData.notifyUser || formData.notifyMedicalProfile) && (
            <label>
              Intervalo de lembretes
              <select
                value={formData.reminderPeriodMinutes}
                onChange={(event) => setFormData((current) => ({ ...current, reminderPeriodMinutes: event.target.value }))}
              >
                <option value="60">A cada 1 hora</option>
                <option value="360">A cada 6 horas</option>
                <option value="720">A cada 12 horas</option>
                <option value="1440">A cada 1 dia</option>
                <option value="2880">A cada 2 dias</option>
              </select>
            </label>
          )}

          <button className="primary-action" type="submit" disabled={formLoading}>
            {editingEventId ? <Save size={18} /> : <Plus size={18} />}
            {formLoading ? 'Salvando...' : editingEventId ? 'Salvar evento' : 'Cadastrar evento'}
          </button>
        </form>
      </aside>
    </section>
  );
}
