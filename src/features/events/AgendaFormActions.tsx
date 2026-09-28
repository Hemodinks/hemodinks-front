import { Plus, Save } from 'lucide-react';
import { Button } from '../../shared/components/ui';

type Props = { editing: boolean; loading: boolean; onCancel: () => void };
export function AgendaFormActions({ editing, loading, onCancel }: Props) {
  return <div className="agenda-form-actions" role="group" aria-label="Ações do evento">
    <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>Cancelar</Button>
    <Button variant="primary" type="submit" disabled={loading} data-tour="agenda-save">
      {editing ? <Save size={18} /> : <Plus size={18} />}
      {loading ? 'Salvando...' : editing ? 'Salvar evento' : 'Criar evento'}
    </Button>
  </div>;
}
