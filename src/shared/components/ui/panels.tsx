import type { HTMLAttributes, ReactNode } from 'react';
import { classNames as cx } from './classNames';

type PanelProps = HTMLAttributes<HTMLElement> & { children: ReactNode };

export function DataPanel({ className, children, ...props }: PanelProps) {
  return <section {...props} className={cx('data-panel', className)}>{children}</section>;
}

export function FormPanel({ className, children, ...props }: PanelProps) {
  return <aside {...props} className={cx('form-panel', className)}>{children}</aside>;
}
