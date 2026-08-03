import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './uiClassNames';

type AlertMessageProps = {
  type: 'success' | 'error' | 'warning';
  icon?: ReactNode;
  children: ReactNode;
};

export function AlertMessage({ type, icon, children }: AlertMessageProps) {
  return (
    <p className={`alert ${type}`}>
      {icon}
      {children}
    </p>
  );
}

type PanelProps = HTMLAttributes<HTMLElement> & { children: ReactNode };

export function DataPanel({ className, children, ...props }: PanelProps) {
  return (
    <section {...props} className={cx('data-panel', className)}>
      {children}
    </section>
  );
}

export function FormPanel({ className, children, ...props }: PanelProps) {
  return (
    <aside {...props} className={cx('form-panel', className)}>
      {children}
    </aside>
  );
}
