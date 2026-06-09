import { X } from 'lucide-react';
import type { AuthSession } from '../../types';
import { PasswordForm } from './PasswordForm';

type PasswordModalProps = {
  session: AuthSession;
  onChanged: (message: string) => void;
  onClose: () => void;
};

export function PasswordModal({ session, onChanged, onClose }: PasswordModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="password-title">
        <div className="panel-title">
          <div>
            <span className="eyebrow">Seguranca</span>
            <h2 id="password-title">Mudar senha</h2>
          </div>
          <button type="button" className="icon-button muted" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </div>
        <PasswordForm
          session={session}
          onChanged={onChanged}
          onCancel={onClose}
        />
      </section>
    </div>
  );
}
