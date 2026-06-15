import {
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Search } from 'lucide-react';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'ghost' | 'danger-ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export function Button({
  variant = 'ghost',
  fullWidth = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={cx(
        variant === 'primary' && 'primary-action',
        variant === 'ghost' && 'ghost-button',
        variant === 'danger-ghost' && 'ghost-button danger-text',
        fullWidth && 'full-width',
        className,
      )}
    />
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
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cx(
        'icon-button',
        tone === 'muted' && 'muted',
        tone === 'danger' && 'danger',
        className,
      )}
    />
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
