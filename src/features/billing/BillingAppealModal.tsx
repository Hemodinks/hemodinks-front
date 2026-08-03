import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Send, X } from 'lucide-react';
import { Modal } from '../../shared/components/Modal';
import { Button, IconButton, TextareaField, TextField } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import type { AppealDraftState } from './billingPageTypes';

type BillingAppealModalProps = {
  valorGlosado: number;
  draft: AppealDraftState;
  loading: boolean;
  setDraft: Dispatch<SetStateAction<AppealDraftState>>;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};

export function BillingAppealModal({
  valorGlosado,
  draft,
  loading,
  setDraft,
  onClose,
  onSubmit,
}: BillingAppealModalProps) {
  return (
    <Modal titleId="billing-appeal-title" className="billing-appeal-modal" onClose={onClose}>
      <div className="panel-title billing-appeal-header">
        <div>
          <span className="eyebrow">Contestação de glosa</span>
          <h2 id="billing-appeal-title">Registrar recurso</h2>
          <p className="billing-modal-subtitle">
            Informe a justificativa que será enviada para análise.
          </p>
        </div>
        <IconButton label="Fechar recurso de glosa" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      <div className="billing-appeal-summary">
        <span>Valor glosado</span>
        <strong>{formatCurrency(valorGlosado)}</strong>
      </div>
      <form className="billing-appeal-form" onSubmit={onSubmit}>
        <TextareaField
          label="Justificativa"
          value={draft.justificativa}
          required
          rows={5}
          placeholder="Descreva os fundamentos do recurso e os documentos que comprovam a cobrança."
          onValueChange={(justificativa) => setDraft((current) => ({ ...current, justificativa }))}
        />
        <div className="billing-appeal-value-row">
          <TextField
            label="Valor recuperado"
            type="number"
            min="0"
            max={valorGlosado}
            step="0.01"
            value={draft.valorRecuperado}
            required
            onValueChange={(valorRecuperado) =>
              setDraft((current) => ({ ...current, valorRecuperado }))
            }
          />
          <p className="billing-appeal-help">
            Mantenha o valor em zero enquanto o recurso estiver aguardando resposta. Atualize-o
            somente após o retorno do convênio.
          </p>
        </div>
        <div className="billing-appeal-actions">
          <Button variant="danger-ghost" type="button" onClick={onClose} disabled={loading}>
            <X size={16} />
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            <Send size={16} />
            {loading ? 'Registrando...' : 'Registrar recurso'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
