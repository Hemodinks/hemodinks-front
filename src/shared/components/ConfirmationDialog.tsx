import { CheckCircle2, Trash2 } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { Button } from './ui';
import { Modal } from './Modal';

export type ConfirmationTone = 'delete' | 'update';

export type ConfirmationRequest = {
  tone: ConfirmationTone;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // Motivo obrigatorio (ex.: inativar/reativar paciente); o texto digitado vai para onConfirm.
  reason?: { label: string; maxLength: number; hint?: string };
  onConfirm: (reason?: string) => void | Promise<void>;
};

export type ConfirmAction = (request: ConfirmationRequest) => void;

type ConfirmationDialogProps = ConfirmationRequest & {
  loading: boolean;
  onCancel: () => void;
};

function getToneIcon(tone: ConfirmationTone): ReactNode {
  if (tone === 'delete') {
    return <Trash2 size={24} />;
  }

  return <CheckCircle2 size={24} />;
}

function ConfirmationDialog({
  tone,
  title,
  message,
  confirmLabel = 'Sim',
  cancelLabel = 'Não',
  reason,
  loading,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const titleId = `confirmation-${tone}-title`;
  const reasonId = useId();
  const [reasonText, setReasonText] = useState('');
  const missingReason = Boolean(reason) && !reasonText.trim();

  return (
    <Modal titleId={titleId} className={`confirmation-modal ${tone}`} onClose={onCancel}>
      <div className="confirmation-icon" aria-hidden="true">
        {getToneIcon(tone)}
      </div>
      <div className="confirmation-copy">
        <span className="eyebrow">{tone === 'delete' ? 'Confirmar exclusão' : 'Confirmar alteração'}</span>
        <h2 id={titleId}>{title}</h2>
        <p>{message}</p>
        {reason && (
          <div className="confirmation-reason">
            <label htmlFor={reasonId}>{reason.label}</label>
            <textarea
              id={reasonId}
              value={reasonText}
              maxLength={reason.maxLength}
              rows={4}
              required
              disabled={loading}
              aria-describedby={reason.hint ? `${reasonId}-hint ${reasonId}-count` : `${reasonId}-count`}
              onChange={(event) => setReasonText(event.target.value.slice(0, reason.maxLength))}
            />
            {reason.hint && <small id={`${reasonId}-hint`} className="confirmation-reason-hint">{reason.hint}</small>}
            <small id={`${reasonId}-count`} aria-live="polite">{reasonText.length}/{reason.maxLength} caracteres</small>
          </div>
        )}
      </div>
      <div className="confirmation-actions">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={tone === 'delete' ? 'danger-ghost' : 'primary'}
          onClick={() => void onConfirm(reason ? reasonText.trim() : undefined)}
          disabled={loading || missingReason}
        >
          {loading ? 'Aguarde...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function useConfirmationDialog() {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);
  const [loading, setLoading] = useState(false);

  const close = () => {
    if (!loading) {
      setRequest(null);
    }
  };

  const confirmAction: ConfirmAction = (nextRequest) => {
    setRequest(nextRequest);
  };

  const handleConfirm = async (reason?: string) => {
    if (!request) {
      return;
    }

    setLoading(true);

    try {
      await request.onConfirm(reason);
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    confirmAction,
    confirmationDialog: request ? (
      <ConfirmationDialog
        {...request}
        loading={loading}
        onCancel={close}
        onConfirm={handleConfirm}
      />
    ) : null,
  };
}
