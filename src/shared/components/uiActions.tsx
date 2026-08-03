import {
  type ButtonHTMLAttributes,
  type ReactNode,
  isValidElement,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cx } from './uiClassNames';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger-ghost';
  fullWidth?: boolean;
};

function getButtonText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getButtonText).join(' ');
  if (isValidElement<{ children?: ReactNode }>(node)) return getButtonText(node.props.children);
  return '';
}

export function Button({
  variant = 'ghost',
  fullWidth = false,
  className,
  type = 'button',
  title,
  children,
  'aria-label': ariaLabel,
  ...props
}: ButtonProps) {
  const tooltip = title ?? ariaLabel ?? getButtonText(children).replace(/\s+/g, ' ').trim();
  return (
    <button
      {...props}
      type={type}
      aria-label={ariaLabel}
      title={tooltip || undefined}
      className={cx(
        variant === 'primary' && 'primary-action',
        variant === 'ghost' && 'ghost-button',
        variant === 'danger-ghost' && 'ghost-button danger-text',
        fullWidth && 'full-width',
        className,
      )}
    >
      {children}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: 'default' | 'muted' | 'danger';
};

export function IconButton({
  label,
  tone = 'default',
  className,
  title,
  type = 'button',
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  'aria-describedby': ariaDescribedBy,
  ...props
}: IconButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();
  const tooltipText = title ?? label;
  const [tooltipPosition, setTooltipPosition] = useState<{
    left: number;
    top: number;
    placement: 'above' | 'below';
  } | null>(null);

  const showTooltip = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const placement = rect.bottom + 72 > window.innerHeight ? 'above' : 'below';
    setTooltipPosition({
      left: Math.min(Math.max(rect.left + rect.width / 2, 132), window.innerWidth - 132),
      top: placement === 'above' ? rect.top - 9 : rect.bottom + 9,
      placement,
    });
  };

  return (
    <>
      <button
        {...props}
        ref={buttonRef}
        type={type}
        aria-label={label}
        aria-describedby={tooltipPosition ? tooltipId : ariaDescribedBy}
        title={tooltipText}
        onMouseEnter={(event) => {
          showTooltip();
          onMouseEnter?.(event);
        }}
        onMouseLeave={(event) => {
          setTooltipPosition(null);
          onMouseLeave?.(event);
        }}
        onFocus={(event) => {
          showTooltip();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setTooltipPosition(null);
          onBlur?.(event);
        }}
        className={cx(
          'icon-button',
          tone === 'muted' && 'muted',
          tone === 'danger' && 'danger',
          className,
        )}
      />
      {tooltipPosition &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className={`action-tooltip ${tooltipPosition.placement}`}
            style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
          >
            {tooltipText}
          </span>,
          document.body,
        )}
    </>
  );
}
