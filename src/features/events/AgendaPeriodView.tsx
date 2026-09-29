import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AgendaEvent } from '../../types';
import { IconButton } from '../../shared/components/ui';
import { AgendaEventCard, type AgendaEventActions } from './AgendaEventCard';
import { indexMonthEvents } from './agendaMonth';
import { fromDateKey, monthTitle, toDateKey } from './agendaUtils';
import { listEventGroups, weekDays } from './agendaViews';

type Props = AgendaEventActions & {
  view: 'week' | 'list'; visibleMonth: Date; selectedDate: string; todayKey: string;
  events: AgendaEvent[]; loading: boolean;
  onSelectDate: (date: Date) => void; onPrevious: () => void; onNext: () => void;
};
const dayLabel = (date: Date) => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
export function AgendaPeriodView({ view, visibleMonth, selectedDate, todayKey, events, loading, onSelectDate, onPrevious, onNext, ...actions }: Props) {
  const days = useMemo(() => weekDays(selectedDate), [selectedDate]);
  const byDay = useMemo(() => indexMonthEvents(days, events), [days, events]);
  const first = toDateKey(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1));
  const groups = useMemo(() => listEventGroups(events, first, todayKey), [events, first, todayKey]);
  const card = (event: AgendaEvent, day?: string) => <AgendaEventCard key={event.id} agendaEvent={event} {...actions} idSuffix={day} />;
  return <section className="agenda-period-view" aria-label={view === 'week' ? 'Agenda da semana' : 'Agenda em lista'} aria-busy={loading}>
    <div className="agenda-monthbar agenda-periodbar">
      <IconButton label={view === 'week' ? 'Semana anterior' : 'Mes anterior'} onClick={onPrevious}><ChevronLeft size={18} /></IconButton>
      <strong>{view === 'week' ? `${dayLabel(days[0])} a ${dayLabel(days[6])} de ${days[6].getFullYear()}` : monthTitle(visibleMonth)}</strong>
      <IconButton label={view === 'week' ? 'Próxima semana' : 'Proximo mes'} onClick={onNext}><ChevronRight size={18} /></IconButton>
    </div>
    <p className="agenda-period-hint">Selecione um dia para usá-lo ao criar um novo evento.</p>
    {loading ? <p role="status">Carregando eventos...</p> : view === 'week' ? <div className="agenda-week-grid">
      {days.map(day => {
        const date = toDateKey(day); const items = byDay.get(date) ?? [];
        return <section key={date} className="agenda-week-day" aria-label={dayLabel(day)}>
          <button type="button" className="agenda-period-day" aria-pressed={date === selectedDate}
            aria-current={date === todayKey ? 'date' : undefined} onClick={() => onSelectDate(day)}>{dayLabel(day)}{date === todayKey && ' · Hoje'}</button>
          {items.length ? items.map(event => card(event, date)) : <p className="agenda-empty">Nenhum evento nesta data.</p>}
        </section>;
      })}
    </div> : groups.length ? <div className="agenda-list-groups">
      {groups.map((group, index) => <div key={group.date}>
        {(index === 0 || groups[index - 1].section !== group.section) && <h3>{group.section}</h3>}
        <section aria-label={dayLabel(fromDateKey(group.date))} className="agenda-list-day">
          <button type="button" className="agenda-period-day" aria-pressed={group.date === selectedDate}
            aria-current={group.date === todayKey ? 'date' : undefined} onClick={() => onSelectDate(fromDateKey(group.date))}>{dayLabel(fromDateKey(group.date))}</button>
          {group.events.map(event => card(event))}
        </section>
      </div>)}
    </div> : <p className="agenda-empty">Nenhum evento neste período.</p>}
  </section>;
}
