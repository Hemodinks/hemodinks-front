import { useEffect, useRef, useState } from 'react';
import { AgendaMonthGrid } from './AgendaMonthGrid';
import { AgendaEventCard } from './AgendaEventCard';
import { AgendaMobileDatePicker } from './AgendaMobileDatePicker';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import type { AgendaEvent, PublicHoliday } from '../../types';
import { Button, IconButton } from '../../shared/components/ui';
import {
  fromDateKey,
  getHolidayTitle,
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
              return <AgendaEventCard key={agendaEvent.id} agendaEvent={agendaEvent} isAdmin={isAdmin} currentUserId={currentUserId}
                onComplete={onComplete} onEdit={onEdit} onDelete={onDelete} />;
            })
          ) : (
            <p className="agenda-empty">Nenhum evento nesta data.</p>
          )}
        </div>
      </div>
    </>
  );
}
