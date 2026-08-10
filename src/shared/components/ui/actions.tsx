import type { ButtonHTMLAttributes, ChangeEvent, InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { classNames } from './classNames';

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
      className={classNames(
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
      className={classNames(
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
    <label className={classNames('search-box', className)}>
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

export function TextField({ label, value, onValueChange, className, ...props }: TextFieldProps) {
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
