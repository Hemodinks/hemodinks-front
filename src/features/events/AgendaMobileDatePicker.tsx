import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton, TextField } from '../../shared/components/ui';
import { fromDateKey } from './agendaUtils';
import { isAgendaDateValid } from './agendaDateTime';

type Props = { selectedDate: string; onSelectDate: (date: Date) => void };
export function AgendaMobileDatePicker({ selectedDate, onSelectDate }: Props) {
  const moveDay = (offset: number) => {
    const date = fromDateKey(selectedDate);
    date.setDate(date.getDate() + offset);
    onSelectDate(date);
  };
  return <div className="agenda-mobile-date" aria-label="Navegação diária" role="group">
    <IconButton label="Dia anterior" onClick={() => moveDay(-1)}><ChevronLeft size={18} /></IconButton>
    <TextField type="date" label="Data da agenda" value={selectedDate} required
      onValueChange={value => { if (isAgendaDateValid(value)) onSelectDate(fromDateKey(value)); }} />
    <IconButton label="Próximo dia" onClick={() => moveDay(1)}><ChevronRight size={18} /></IconButton>
  </div>;
}
