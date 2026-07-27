import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Save, X } from "lucide-react";
import { Modal } from "../../shared/components/Modal";
import {
  Button,
  IconButton,
  SelectField,
  TextField,
} from "../../shared/components/ui";
import type {
  GlosaDraftState,
  RecursoDraftState,
} from "./billingPageTypes";

export function GlosaEditModal({
  draft,
  setDraft,
  onClose,
  onSubmit,
}: {
  draft: GlosaDraftState;
  setDraft: Dispatch<SetStateAction<GlosaDraftState | null>>;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
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
        <TextField label="Código do motivo" value={draft.codigoMotivo} onValueChange={(value) => field("codigoMotivo", value)} />
        <TextField label="Descrição do motivo" value={draft.descricaoMotivo} required onValueChange={(value) => field("descricaoMotivo", value)} />
        <TextField label="Valor glosado" type="number" min="0" step="0.01" value={draft.valorGlosado} required onValueChange={(value) => field("valorGlosado", value)} />
        <TextField label="Data da glosa" type="date" value={draft.dataGlosa} required onValueChange={(value) => field("dataGlosa", value)} />
        <TextField label="Observação" value={draft.observacao} onValueChange={(value) => field("observacao", value)} />
        <Button variant="primary" type="submit"><Save size={16} />Salvar glosa</Button>
      </form>
    </Modal>
  );
}

export function RecursoEditModal({
  draft,
  setDraft,
  onClose,
  onSubmit,
}: {
  draft: RecursoDraftState;
  setDraft: Dispatch<SetStateAction<RecursoDraftState | null>>;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const field = (key: keyof RecursoDraftState, value: string) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  return (
    <Modal titleId="recurso-edit-title" onClose={onClose}>
      <div className="panel-title">
        <h2 id="recurso-edit-title">Editar recurso de glosa</h2>
        <IconButton label="Fechar edição do recurso" tone="muted" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      <form className="billing-filter-grid" onSubmit={onSubmit}>
        <TextField label="Data de envio" type="date" value={draft.dataEnvio} onValueChange={(value) => field("dataEnvio", value)} />
        <TextField label="Justificativa" value={draft.justificativa} required onValueChange={(value) => field("justificativa", value)} />
        <TextField label="Valor recorrido" type="number" min="0" step="0.01" value={draft.valorRecorrido} required onValueChange={(value) => field("valorRecorrido", value)} />
        <TextField label="Data da resposta" type="date" value={draft.dataResposta} onValueChange={(value) => field("dataResposta", value)} />
        <TextField label="Valor recuperado" type="number" min="0" step="0.01" value={draft.valorRecuperado} required onValueChange={(value) => field("valorRecuperado", value)} />
        <SelectField label="Status" value={draft.status} onChange={(event) => field("status", event.target.value)}>
          {["EmPreparacao", "Enviado", "Aceito", "AceitoParcialmente", "Negado", "Cancelado"].map((status) => <option key={status}>{status}</option>)}
        </SelectField>
        <TextField label="Observação" value={draft.observacao} onValueChange={(value) => field("observacao", value)} />
        <Button variant="primary" type="submit"><Save size={16} />Salvar recurso</Button>
      </form>
    </Modal>
  );
}
