import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  CheckCircle2,
  ChevronLeft,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { Modal } from "../../shared/components/Modal";
import {
  Button,
  IconButton,
  TextareaField,
  TextField,
} from "../../shared/components/ui";
import { formatCurrency } from "../../shared/utils/formatters";
import type {
  AppealDraftState,
  BillingReturnDraft,
} from "./billingPageTypes";

type ReturnModalProps = {
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
}: ReturnModalProps) {
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
        <IconButton
          label="Fechar retorno do faturamento"
          tone="muted"
          onClick={onClose}
        >
          <X size={16} />
        </IconButton>
      </div>
      <form className="billing-return-form" onSubmit={onSubmit}>
        <div className="billing-return-list">
          {draft.map((item, index) => {
            const hasGlosa =
              Number(item.valorGlosado.replace(",", ".")) > 0;
            return (
              <article
                className="billing-return-item"
                key={item.faturamentoItemId}
              >
                <div className="billing-return-description">
                  <span>Procedimento {index + 1}</span>
                  <strong>{item.descricao}</strong>
                  <small>
                    Apresentado: {formatCurrency(item.valorApresentado)}
                  </small>
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
                        position === index
                          ? { ...currentItem, valorGlosado: value }
                          : currentItem,
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
                          position === index
                            ? { ...currentItem, motivoGlosa: value }
                            : currentItem,
                        ),
                      )
                    }
                  />
                ) : (
                  <span className="billing-return-no-glosa">
                    Sem glosa para este procedimento
                  </span>
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

type AppealModalProps = {
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
}: AppealModalProps) {
  return (
    <Modal
      titleId="billing-appeal-title"
      className="billing-appeal-modal"
      onClose={onClose}
    >
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
          onValueChange={(justificativa) =>
            setDraft((current) => ({ ...current, justificativa }))
          }
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
            Mantenha o valor em zero enquanto o recurso estiver aguardando
            resposta. Atualize-o somente após o retorno do convênio.
          </p>
        </div>
        <div className="billing-appeal-actions">
          <Button
            variant="danger-ghost"
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            <X size={16} />
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            <Send size={16} />
            {loading ? "Registrando..." : "Registrar recurso"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type ReversalModalProps = {
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
}: ReversalModalProps) {
  return (
    <Modal
      titleId="billing-reversal-title"
      className="billing-reversal-modal"
      onClose={onClose}
    >
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
          O recebimento será marcado como estornado e o saldo do título será
          recalculado automaticamente.
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
