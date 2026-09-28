import { Button, SelectField, TextField } from '../../shared/components/ui';
import type { AgendaView } from './agendaViews';

type Props = {
  view: AgendaView; setView: (view: AgendaView) => void;
  search: string; setSearch: (value: string) => void;
  status: string; setStatus: (value: string) => void;
  responsibility: string; setResponsibility: (value: string) => void;
};
export function AgendaViewToolbar({ view, setView, search, setSearch, status, setStatus, responsibility, setResponsibility }: Props) {
  return <div className="agenda-view-toolbar">
    <div role="group" aria-label="Visualização da agenda" className="agenda-view-options">
      {([['month', 'Mês'], ['week', 'Semana'], ['list', 'Lista']] as const).map(([value, label]) =>
        <Button key={value} type="button" variant="ghost" aria-pressed={view === value}
          className={view === value ? 'is-active' : ''} onClick={() => setView(value)}>{label}</Button>)}
    </div>
    <div className="agenda-view-filters">
      <TextField label="Buscar evento" type="search" placeholder="Título ou descrição" maxLength={200}
        value={search} onValueChange={setSearch} />
      <SelectField label="Situação" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="all">Todos os eventos</option><option value="active">Ativos</option><option value="completed">Concluídos</option>
      </SelectField>
      <SelectField label="Responsável" value={responsibility} onChange={event => setResponsibility(event.target.value)}>
        <option value="all">Todos os permitidos</option><option value="mine">Sob minha responsabilidade</option>
      </SelectField>
    </div>
  </div>;
}
