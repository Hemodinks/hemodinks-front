import { X } from 'lucide-react';
import type { AuthSession } from '../../types';
import { Modal } from './Modal';
import { PasswordForm } from './PasswordForm';
import { IconButton } from './ui';

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
          <IconButton label="Fechar mudanca de senha" title="Fechar" tone="muted" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <PasswordForm
          session={session}
          onChanged={onChanged}
          onCancel={onClose}
        />
      </Modal>
  );
}
