import type { FormEvent } from 'react';
import { ChevronLeft, RotateCcw, X } from 'lucide-react';
import { Modal } from '../../shared/components/Modal';
import { Button, TextField } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';

type BillingReversalModalProps = {
  valor: number;
  reason: string;
  loading: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};

export function BillingReversalModal({
  valor,
  reason,
  loading,
  onReasonChange,
  onClose,
  onSubmit,
}: BillingReversalModalProps) {
  return (
    <Modal titleId="billing-reversal-title" className="billing-reversal-modal" onClose={onClose}>
      <div className="panel-title">
        <div>
          <span className="eyebrow">Estorno de recebimento</span>
          <h2 id="billing-reversal-title">Confirmar estorno</h2>
          <p className="billing-modal-subtitle">
            Valor selecionado: <strong>{formatCurrency(valor)}</strong>
          </p>
        </div>
        <Button aria-label="Fechar estorno" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>
      <form className="billing-reversal-form" onSubmit={onSubmit}>
        <p className="billing-reversal-notice">
          O recebimento será marcado como estornado e o saldo do título será recalculado
          automaticamente.
        </p>
        <TextField
          label="Motivo do estorno"
          value={reason}
          required
          onValueChange={onReasonChange}
        />
        <div className="billing-reversal-actions">
          <Button type="button" onClick={onClose}>
            <ChevronLeft size={16} />
            Voltar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            <RotateCcw size={16} />
            Confirmar estorno
          </Button>
        </div>
      </form>
    </Modal>
  );
}
