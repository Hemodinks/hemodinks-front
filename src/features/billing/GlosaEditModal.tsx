import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Save, X } from 'lucide-react';
import { Modal } from '../../shared/components/Modal';
import { Button, IconButton, TextField } from '../../shared/components/ui';
import type { GlosaDraftState } from './billingPageTypes';

type GlosaEditModalProps = {
  draft: GlosaDraftState;
  setDraft: Dispatch<SetStateAction<GlosaDraftState | null>>;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};

export function GlosaEditModal({ draft, setDraft, onClose, onSubmit }: GlosaEditModalProps) {
  const field = (key: keyof GlosaDraftState, value: string) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  return (
    <Modal titleId="glosa-edit-title" onClose={onClose}>
      <div className="panel-title">
        <h2 id="glosa-edit-title">Editar glosa</h2>
        <IconButton label="Fechar edição da glosa" tone="muted" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      <form className="billing-filter-grid" onSubmit={onSubmit}>
        <TextField
          label="Código do motivo"
          value={draft.codigoMotivo}
          onValueChange={(value) => field('codigoMotivo', value)}
        />
        <TextField
          label="Descrição do motivo"
          value={draft.descricaoMotivo}
          required
          onValueChange={(value) => field('descricaoMotivo', value)}
        />
        <TextField
          label="Valor glosado"
          type="number"
          min="0"
          step="0.01"
          value={draft.valorGlosado}
          required
          onValueChange={(value) => field('valorGlosado', value)}
        />
        <TextField
          label="Data da glosa"
          type="date"
          value={draft.dataGlosa}
          required
          onValueChange={(value) => field('dataGlosa', value)}
        />
        <TextField
          label="Observação"
          value={draft.observacao}
          onValueChange={(value) => field('observacao', value)}
        />
        <Button variant="primary" type="submit">
          <Save size={16} />
          Salvar glosa
        </Button>
      </form>
    </Modal>
  );
}
