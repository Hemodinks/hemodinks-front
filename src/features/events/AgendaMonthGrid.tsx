import { useMemo } from 'react';
import type { AgendaEvent, PublicHoliday } from '../../types';
import { getHolidayTitle, toDateKey, weekdayLabels } from './agendaUtils';
import { eventTime, indexMonthEvents, visibleEventsPerDay } from './agendaMonth';

type Props = {
  days: Date[]; visibleMonth: Date; events: AgendaEvent[]; selectedDate: string; todayKey: string;
  holidayByDate: Map<string, PublicHoliday>; loading: boolean;
  onSelectDate: (date: Date) => void;
  onReveal: (date: Date, eventId?: number) => void;
};
export function AgendaMonthGrid({ days, visibleMonth, events, selectedDate, todayKey, holidayByDate, loading, onSelectDate, onReveal }: Props) {
  const byDay = useMemo(() => indexMonthEvents(days, events), [days, events]);
  return <div className="agenda-calendar" aria-busy={loading}>
    {weekdayLabels.map(label => <span className="agenda-weekday" key={label}>{label}</span>)}
    {days.map(date => {
      const key = toDateKey(date);
      const label = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(date);
      const items = byDay.get(key) ?? [];
      const holiday = holidayByDate.get(key);
      const today = key === todayKey;
      const selected = key === selectedDate;
      const outside = date.getMonth() !== visibleMonth.getMonth() || date.getFullYear() !== visibleMonth.getFullYear();
      return <div key={key} role="group" aria-label={label} data-date={key}
        className={['agenda-day', outside && 'muted', today && 'today', selected && 'selected', holiday && 'holiday', items.length > 0 && 'has-events'].filter(Boolean).join(' ')}>
        <button type="button" className="agenda-day-select" aria-label={label} aria-pressed={selected}
          aria-current={today ? 'date' : undefined} onClick={() => onSelectDate(date)}>
          <span className="agenda-day-number">{date.getDate()}</span>
          {today && <span className="agenda-today-label">Hoje</span>}
        </button>
        {holiday && <span className="agenda-holiday-dot" title={getHolidayTitle(holiday)}>{getHolidayTitle(holiday)}</span>}
        <div className="agenda-day-previews">
          {items.slice(0, visibleEventsPerDay).map(event => <button type="button" className="agenda-event-preview" key={event.id}
            title={`${event.isAllDay ? 'Dia inteiro' : eventTime(event.start)} ${event.title}`} onClick={() => onReveal(date, event.id)}>
            {event.isAllDay ? <span>Dia inteiro</span> : <time dateTime={event.start}>{eventTime(event.start)}</time>} <span>{event.title}</span>
          </button>)}
          {items.length > visibleEventsPerDay && <button type="button" className="agenda-more-events" onClick={() => onReveal(date)}>
            +{items.length - visibleEventsPerDay} eventos
          </button>}
        </div>
      </div>;
    })}
  </div>;
}
