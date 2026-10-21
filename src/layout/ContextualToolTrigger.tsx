import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  expanded: boolean;
  panelId: string;
  icon: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

export function ContextualToolTrigger({ expanded, panelId, icon, children, ...props }: Props) {
  return <button {...props} type="button" className="contextual-flow-trigger"
    aria-expanded={expanded} aria-controls={panelId}>
    {icon}<span>{children}</span>
  </button>;
}
