import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type { AgendaEvent, PublicHoliday } from '../../types';
import { Button, IconButton } from '../../shared/components/ui';
import {
  eventTouchesDate,
  formatDateTime,
  fromDateKey,
  getHolidayTitle,
  monthTitle,
  toDateKey,
  weekdayLabels,
} from './agendaUtils';

type AgendaCalendarSectionProps = {
  visibleMonth: Date;
  days: Date[];
  events: AgendaEvent[];
  selectedDate: string;
  selectedEvents: AgendaEvent[];
  selectedHoliday?: PublicHoliday;
  holidayByDate: Map<string, PublicHoliday>;
  todayKey: string;
  loading: boolean;
  holidayLoading: boolean;
  isAdmin: boolean;
  currentUserId: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: Date) => void;
  onOpenDraftForSelectedDate: () => void;
  onComplete: (agendaEvent: AgendaEvent) => void;
  onEdit: (agendaEvent: AgendaEvent) => void;
  onDelete: (agendaEvent: AgendaEvent) => void;
};

export function AgendaCalendarSection({
  visibleMonth,
  days,
  events,
  selectedDate,
  selectedEvents,
  selectedHoliday,
  holidayByDate,
  todayKey,
  loading,
  holidayLoading,
  isAdmin,
  currentUserId,
  onPreviousMonth,
  onNextMonth,
  onSelectDate,
  onOpenDraftForSelectedDate,
  onComplete,
  onEdit,
  onDelete,
}: AgendaCalendarSectionProps) {
  return (
    <>
      <div className="agenda-monthbar">
        <IconButton label="Mes anterior" onClick={onPreviousMonth}>
          <ChevronLeft size={18} />
        </IconButton>
        <strong>{monthTitle(visibleMonth)}</strong>
        <IconButton label="Proximo mes" onClick={onNextMonth}>
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
              onClick={() => onSelectDate(date)}
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
            <span>Clique para criar um evento ou uma notificação com a data já preenchida.</span>
          </div>
          <div className="agenda-day-actions-buttons">
            <Button type="button" variant="ghost" onClick={onOpenDraftForSelectedDate}>
              <Plus size={17} />
              Novo evento
            </Button>
          </div>
        </div>

        <div className="agenda-event-list">
          {loading ? (
            <p className="agenda-empty">Carregando eventos...</p>
          ) : selectedEvents.length ? (
            selectedEvents.map((agendaEvent) => {
              const canManage = isAdmin || agendaEvent.userId === currentUserId;

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
                      {agendaEvent.notifyMedicalProfile && <span><Bell size={14} /> {agendaEvent.medicalUserName || 'Perfil médico'}</span>}
                      {agendaEvent.isCompleted && <span><Check size={14} /> Concluido</span>}
                    </div>
                  </div>
                  {canManage && (
                    <div className="agenda-event-actions">
                      {!agendaEvent.isCompleted && (
                        <IconButton label="Concluir" tone="muted" onClick={() => onComplete(agendaEvent)}>
                          <Check size={17} />
                        </IconButton>
                      )}
                      <IconButton label="Editar" tone="muted" onClick={() => onEdit(agendaEvent)}>
                        <Pencil size={17} />
                      </IconButton>
                      <IconButton label="Excluir" tone="danger" onClick={() => onDelete(agendaEvent)}>
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
  );
}
