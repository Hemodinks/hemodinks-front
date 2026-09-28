import { useEffect, useRef, useState } from 'react';
import { AgendaMonthGrid } from './AgendaMonthGrid';
import { eventTime } from './agendaMonth';
import { AgendaMobileDatePicker } from './AgendaMobileDatePicker';
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
  formatDateTime,
  fromDateKey,
  getHolidayTitle,
  toDateKey,
  monthTitle,
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
  const selectedPanel = useRef<HTMLDivElement>(null);
  const [reveal, setReveal] = useState<{ id?: number } | null>(null);
  useEffect(() => {
    if (!reveal || loading) return;
    const frame = requestAnimationFrame(() => {
      const target = reveal.id ? document.getElementById(`agenda-event-${reveal.id}`) : selectedPanel.current;
      if (!target) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      setReveal(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [reveal, selectedDate, selectedEvents, loading]);
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

      <AgendaMobileDatePicker selectedDate={selectedDate} onSelectDate={onSelectDate} />
      <AgendaMonthGrid days={days} visibleMonth={visibleMonth} events={events} selectedDate={selectedDate}
        todayKey={todayKey} holidayByDate={holidayByDate} loading={loading || holidayLoading}
        onSelectDate={onSelectDate} onReveal={(date, id) => { onSelectDate(date); setReveal({ id }); }} />

      <div className="agenda-selected" ref={selectedPanel} tabIndex={-1} role="region" aria-label="Eventos da data selecionada">
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
                <article className={`agenda-event-item ${agendaEvent.isCompleted ? 'completed' : ''}`} key={agendaEvent.id} id={`agenda-event-${agendaEvent.id}`} tabIndex={-1}>
                  <div className="agenda-event-main">
                    <span className="agenda-event-time">
                      <Clock size={15} />
                      {toDateKey(new Date(agendaEvent.start)) === toDateKey(new Date(agendaEvent.end)) ? `${eventTime(agendaEvent.start)} - ${eventTime(agendaEvent.end)}` : `${formatDateTime(agendaEvent.start)} - ${formatDateTime(agendaEvent.end)}`}
                    </span>
                    <strong>{agendaEvent.title}</strong>
                    {agendaEvent.description && <p>{agendaEvent.description}</p>}
                    <div className="agenda-event-meta">
                      {!agendaEvent.isCompleted && (agendaEvent.notifyUser || agendaEvent.notifyMedicalProfile) && <span><Bell size={14} /> Lembrete ativo</span>}
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
