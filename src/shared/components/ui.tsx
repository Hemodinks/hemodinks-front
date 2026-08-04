import {
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
  useRef,
  useState,
} from 'react';
import { ChevronDown, Search } from 'lucide-react';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function normalizeComboboxText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
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

type ComboboxFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'children'> & {
  label: string;
  value: string;
  options: string[];
  onValueChange: (value: string) => void;
  noOptionsLabel?: string;
};

export function ComboboxField({
  label,
  value,
  options,
  onValueChange,
  className,
  disabled = false,
  placeholder,
  noOptionsLabel = 'Nenhuma opcao encontrada.',
  ...props
}: ComboboxFieldProps) {
  const fieldId = useId();
  const listboxId = `${fieldId}-listbox`;
  const fieldRef = useRef<HTMLLabelElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const uniqueOptions = [...new Set(
    options
      .map((option) => option.trim())
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }));
  const normalizedValue = normalizeComboboxText(value.trim());
  const filteredOptions = normalizedValue
    ? uniqueOptions.filter((option) => normalizeComboboxText(option).includes(normalizedValue))
    : uniqueOptions;

  const selectOption = (option: string) => {
    onValueChange(option);
    setActiveIndex(-1);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <label
      ref={fieldRef}
      className={cx('combobox-field', className)}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;

        if (nextTarget instanceof Node && fieldRef.current?.contains(nextTarget)) {
          return;
        }

        setIsOpen(false);
        setActiveIndex(-1);
      }}
    >
      {label}
      <div className="combobox-control">
        <input
          {...props}
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
          className="combobox-input"
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          onChange={(event) => {
            onValueChange(event.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={(event) => {
            if (disabled) {
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) => {
                if (!filteredOptions.length) {
                  return -1;
                }

                return current < filteredOptions.length - 1 ? current + 1 : 0;
              });
              return;
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) => {
                if (!filteredOptions.length) {
                  return -1;
                }

                return current > 0 ? current - 1 : filteredOptions.length - 1;
              });
              return;
            }

            if (event.key === 'Enter' && isOpen && activeIndex >= 0 && filteredOptions[activeIndex]) {
              event.preventDefault();
              selectOption(filteredOptions[activeIndex]);
              return;
            }

            if (event.key === 'Escape') {
              setIsOpen(false);
              setActiveIndex(-1);
            }
          }}
        />

        <button
          type="button"
          className="combobox-toggle"
          aria-label={`Abrir opcoes de ${label.toLowerCase()}`}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (disabled) {
              return;
            }

            setIsOpen((current) => !current);
            inputRef.current?.focus();
          }}
        >
          <ChevronDown size={16} />
        </button>

        {isOpen && !disabled && (
          <div className="combobox-listbox" id={listboxId} role="listbox">
            {filteredOptions.length ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  className={cx('combobox-option', activeIndex === index && 'is-active')}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectOption(option);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  {option}
                </button>
              ))
            ) : (
              <div className="combobox-empty">{noOptionsLabel}</div>
            )}
          </div>
        )}
      </div>
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
