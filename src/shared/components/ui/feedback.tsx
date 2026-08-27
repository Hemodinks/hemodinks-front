import { type ReactNode, useEffect, useState } from 'react';
import { X } from 'lucide-react';

type AlertMessageProps = {
  type: 'success' | 'error' | 'warning';
  icon?: ReactNode;
  children: ReactNode;
};

export function AlertMessage({ type, icon, children }: AlertMessageProps) {
  return <p className={`alert ${type}`}>{icon}{children}</p>;
}

export const TOAST_DURATION_MS = 10_000;

type ToastMessageProps = AlertMessageProps & {
  durationMs?: number;
  onClose?: () => void;
};

export function ToastMessage({ type, icon, children, durationMs = TOAST_DURATION_MS, onClose }: ToastMessageProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timeoutId = window.setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, durationMs);
    return () => window.clearTimeout(timeoutId);
  }, [children, durationMs, onClose]);

  if (!visible) return null;

  const close = () => {
    setVisible(false);
    onClose?.();
  };

  return <div className={`alert ${type} toast-message`} role={type === 'error' ? 'alert' : 'status'}>
    {icon}
    <span className="toast-message-copy">{children}</span>
    <button type="button" className="toast-close" aria-label="Fechar aviso" onClick={close}>
      <X size={17} aria-hidden="true" />
    </button>
  </div>;
}
