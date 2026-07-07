import { CheckCircle2, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Button } from './ui';
import { Modal } from './Modal';

export type ConfirmationTone = 'delete' | 'update';

export type ConfirmationRequest = {
  tone: ConfirmationTone;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
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

export function ConfirmationDialog({
  tone,
  title,
  message,
  confirmLabel = 'Sim',
  cancelLabel = 'Não',
  loading,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const titleId = `confirmation-${tone}-title`;

  return (
    <Modal titleId={titleId} className={`confirmation-modal ${tone}`} onClose={onCancel}>
      <div className="confirmation-icon" aria-hidden="true">
        {getToneIcon(tone)}
      </div>
      <div className="confirmation-copy">
        <span className="eyebrow">{tone === 'delete' ? 'Confirmar exclusão' : 'Confirmar alteração'}</span>
        <h2 id={titleId}>{title}</h2>
        <p>{message}</p>
      </div>
      <div className="confirmation-actions">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={tone === 'delete' ? 'danger-ghost' : 'primary'}
          onClick={() => void onConfirm()}
          disabled={loading}
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

  const handleConfirm = async () => {
    if (!request) {
      return;
    }

    setLoading(true);

    try {
      await request.onConfirm();
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
