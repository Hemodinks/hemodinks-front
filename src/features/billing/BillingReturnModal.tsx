import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Modal } from '../../shared/components/Modal';
import { Button, IconButton, TextField } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import type { BillingReturnDraft } from './billingPageTypes';

type BillingReturnModalProps = {
  draft: BillingReturnDraft[];
  loading: boolean;
  setDraft: Dispatch<SetStateAction<BillingReturnDraft[]>>;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};

export function BillingReturnModal({
  draft,
  loading,
  setDraft,
  onClose,
  onSubmit,
}: BillingReturnModalProps) {
  return (
    <Modal
      titleId="billing-return-title"
      className="billing-wide-modal billing-return-modal"
      onClose={onClose}
    >
      <div className="panel-title">
        <div>
          <span className="eyebrow">Retorno do convênio</span>
          <h2 id="billing-return-title">Registrar retorno do faturamento</h2>
          <p className="billing-modal-subtitle">
            Informe a glosa de cada procedimento apresentado.
          </p>
        </div>
        <IconButton label="Fechar retorno do faturamento" tone="muted" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      <form className="billing-return-form" onSubmit={onSubmit}>
        <div className="billing-return-list">
          {draft.map((item, index) => {
            const hasGlosa = Number(item.valorGlosado.replace(',', '.')) > 0;
            return (
              <article className="billing-return-item" key={item.faturamentoItemId}>
                <div className="billing-return-description">
                  <span>Procedimento {index + 1}</span>
                  <strong>{item.descricao}</strong>
                  <small>Apresentado: {formatCurrency(item.valorApresentado)}</small>
                </div>
                <TextField
                  label="Valor da glosa"
                  type="number"
                  min="0"
                  max={item.valorApresentado}
                  step="0.01"
                  value={item.valorGlosado}
                  required
                  onValueChange={(value) =>
                    setDraft((current) =>
                      current.map((currentItem, position) =>
                        position === index ? { ...currentItem, valorGlosado: value } : currentItem,
                      ),
                    )
                  }
                />
                {hasGlosa ? (
                  <TextField
                    label="Motivo da glosa"
                    value={item.motivoGlosa}
                    required
                    onValueChange={(value) =>
                      setDraft((current) =>
                        current.map((currentItem, position) =>
                          position === index ? { ...currentItem, motivoGlosa: value } : currentItem,
                        ),
                      )
                    }
                  />
                ) : (
                  <span className="billing-return-no-glosa">Sem glosa para este procedimento</span>
                )}
              </article>
            );
          })}
        </div>
        <div className="billing-return-actions">
          <Button onClick={onClose}>
            <X size={16} />
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            <CheckCircle2 size={16} />
            Confirmar retorno
          </Button>
        </div>
      </form>
    </Modal>
  );
}
