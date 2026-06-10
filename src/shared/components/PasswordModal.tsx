import { X } from 'lucide-react';
import type { AuthSession } from '../../types';
import { Modal } from './Modal';
import { PasswordForm } from './PasswordForm';

type PasswordModalProps = {
  session: AuthSession;
  onChanged: (message: string) => void;
  onClose: () => void;
};

export function PasswordModal({ session, onChanged, onClose }: PasswordModalProps) {
  return (
    <Modal titleId="password-title" onClose={onClose}>
        <div className="panel-title">
          <div>
            <span className="eyebrow">Seguranca</span>
            <h2 id="password-title">Mudar senha</h2>
          </div>
          <button type="button" className="icon-button muted" onClick={onClose} title="Fechar" aria-label="Fechar mudanca de senha">
            <X size={18} />
          </button>
        </div>
        <PasswordForm
          session={session}
          onChanged={onChanged}
          onCancel={onClose}
        />
      </Modal>
  );
}
