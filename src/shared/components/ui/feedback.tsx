import { type ReactNode, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useFocusOnFeedback } from '../../hooks/useFocusOnFeedback';

type AlertMessageProps = {
  type: 'success' | 'error' | 'warning';
  icon?: ReactNode;
  children: ReactNode;
  focusOnDisplay?: boolean;
};

export function AlertMessage({ type, icon, children, focusOnDisplay = type === 'error' }: AlertMessageProps) {
  const feedbackRef = useFocusOnFeedback<HTMLParagraphElement>(focusOnDisplay, children);

  return <p
    ref={feedbackRef}
    className={`alert ${type}`}
    role={type === 'error' ? 'alert' : 'status'}
    tabIndex={focusOnDisplay ? -1 : undefined}
  >{icon}{children}</p>;
}

export const TOAST_DURATION_MS = 10_000;

type ToastMessageProps = AlertMessageProps & {
  durationMs?: number;
  onClose?: () => void;
};

export function ToastMessage({
  type,
  icon,
  children,
  focusOnDisplay = true,
  durationMs = TOAST_DURATION_MS,
  onClose,
}: ToastMessageProps) {
  const [visible, setVisible] = useState(true);
  const feedbackRef = useFocusOnFeedback<HTMLDivElement>(focusOnDisplay && visible, children);

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

  return <div
    ref={feedbackRef}
    className={`alert ${type} toast-message`}
    role={type === 'error' ? 'alert' : 'status'}
    tabIndex={focusOnDisplay ? -1 : undefined}
  >
    {icon}
    <span className="toast-message-copy">{children}</span>
    <button type="button" className="toast-close" aria-label="Fechar aviso" onClick={close}>
      <X size={17} aria-hidden="true" />
    </button>
  </div>;
}
