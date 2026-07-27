import {
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  isValidElement,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
export { ComboboxField } from './ComboboxField';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'ghost' | 'danger-ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

function getButtonText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getButtonText).join(' ');
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getButtonText(node.props.children);
  }

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
  const tooltip =
    title ??
    ariaLabel ??
    getButtonText(children).replace(/\s+/g, ' ').trim() ??
    undefined;

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

    const placement =
      rect.bottom + 72 > window.innerHeight ? 'above' : 'below';

    setTooltipPosition({
      left: Math.min(
        Math.max(rect.left + rect.width / 2, 132),
        window.innerWidth - 132,
      ),
      top: placement === 'above' ? rect.top - 9 : rect.bottom + 9,
      placement,
    });
  };

  const hideTooltip = () => setTooltipPosition(null);

  return (
    <>
      <button
        {...props}
        ref={buttonRef}
        type={type}
        aria-label={label}
        aria-describedby={
          tooltipPosition ? tooltipId : ariaDescribedBy
        }
        title={tooltipText}
        onMouseEnter={(event) => {
          showTooltip();
          onMouseEnter?.(event);
        }}
        onMouseLeave={(event) => {
          hideTooltip();
          onMouseLeave?.(event);
        }}
        onFocus={(event) => {
          showTooltip();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          hideTooltip();
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
            style={{
              left: tooltipPosition.left,
              top: tooltipPosition.top,
            }}
          >
            {tooltipText}
          </span>,
          document.body,
        )}
    </>
  );
}

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
};

export function SearchField({
  label,
  value,
  onValueChange,
  className,
  placeholder = 'Buscar',
  ...props
}: SearchFieldProps) {
  return (
    <label className={cx('search-box', className)}>
      <Search size={17} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input
        {...props}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </label>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string;
  value: string;
  onValueChange: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
};

export function TextField({
  label,
  value,
  onValueChange,
  className,
  ...props
}: TextFieldProps) {
  return (
    <label className={className}>
      {label}
      <input
        {...props}
        value={value}
        onChange={(event) => onValueChange(event.target.value, event)}
      />
    </label>
  );
}

type TextareaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  label: string;
  value: string;
  onValueChange: (value: string, event: ChangeEvent<HTMLTextAreaElement>) => void;
};

export function TextareaField({
  label,
  value,
  onValueChange,
  className,
  ...props
}: TextareaFieldProps) {
  return (
    <label className={className}>
      {label}
      <textarea
        {...props}
        value={value}
        onChange={(event) => onValueChange(event.target.value, event)}
      />
    </label>
  );
}

type CheckboxFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> & {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
};

export function CheckboxField({
  label,
  checked,
  onCheckedChange,
  className,
  ...props
}: CheckboxFieldProps) {
  return (
    <label className={cx('toggle-row', className)}>
      <input
        {...props}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked, event)}
      />
      {label}
    </label>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: ReactNode;
};

export function SelectField({ label, className, children, ...props }: SelectFieldProps) {
  return (
    <label className={className}>
      {label}
      <select {...props}>{children}</select>
    </label>
  );
}

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

type DataPanelProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function DataPanel({ className, children, ...props }: DataPanelProps) {
  return (
    <section {...props} className={cx('data-panel', className)}>
      {children}
    </section>
  );
}

type FormPanelProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function FormPanel({ className, children, ...props }: FormPanelProps) {
  return (
    <aside {...props} className={cx('form-panel', className)}>
      {children}
    </aside>
  );
}
