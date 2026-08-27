import {
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
  useRef,
  useState,
} from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { classNames as cx } from './ui/classNames';

export { Button, IconButton, SearchField, TextField } from './ui/actions';
export { AlertMessage, ToastMessage, TOAST_DURATION_MS } from './ui/feedback';
export { DataPanel, FormPanel } from './ui/panels';

function normalizeComboboxText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
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
  const fieldRef = useRef<HTMLDivElement>(null);
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
    <div
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
      <label htmlFor={fieldId}>{label}</label>
      <div className="combobox-control">
        <input
          {...props}
          id={fieldId}
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
    </div>
  );
}

export type MultiSelectOption = {
  value: string;
  label: string;
};

type MultiSelectComboboxFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'children'> & {
  label: string;
  values: string[];
  options: MultiSelectOption[];
  onValuesChange: (values: string[]) => void;
  allOptionLabel?: string;
  noOptionsLabel?: string;
};

export function MultiSelectComboboxField({
  label,
  values,
  options,
  onValuesChange,
  allOptionLabel = 'Todos',
  noOptionsLabel = 'Nenhuma opção encontrada.',
  className,
  disabled = false,
  placeholder,
  ...props
}: MultiSelectComboboxFieldProps) {
  const fieldId = useId();
  const listboxId = `${fieldId}-listbox`;
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const selectedValues = new Set(values);
  const uniqueOptions = options.filter((option, index, list) => (
    option.value && list.findIndex((candidate) => candidate.value === option.value) === index
  ));
  const normalizedQuery = normalizeComboboxText(query.trim());
  const filteredOptions = normalizedQuery
    ? uniqueOptions.filter((option) => normalizeComboboxText(option.label).includes(normalizedQuery))
    : uniqueOptions;

  const toggleValue = (value: string) => {
    onValuesChange(selectedValues.has(value)
      ? values.filter((selected) => selected !== value)
      : [...values, value]);
    setQuery('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div
      ref={fieldRef}
      className={cx('multi-combobox-field', className)}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !fieldRef.current?.contains(nextTarget)) {
          setIsOpen(false);
          setQuery('');
        }
      }}
    >
      <label htmlFor={fieldId}>{label}</label>
      <div className="multi-combobox-control" onClick={() => inputRef.current?.focus()}>
        {values.map((value) => {
          const option = uniqueOptions.find((candidate) => candidate.value === value);
          return option ? (
            <span className="multi-combobox-chip" key={value}>
              {option.label}
              <button
                type="button"
                aria-label={`Remover ${option.label}`}
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleValue(value);
                }}
              >
                <X size={13} />
              </button>
            </span>
          ) : null;
        })}
        <input
          {...props}
          id={fieldId}
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={values.length ? 'Digite para adicionar...' : (placeholder ?? allOptionLabel)}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onFocus={() => !disabled && setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setIsOpen(false);
              setQuery('');
            } else if (event.key === 'Backspace' && !query && values.length) {
              onValuesChange(values.slice(0, -1));
            } else if (event.key === 'Enter' && filteredOptions.length === 1) {
              event.preventDefault();
              toggleValue(filteredOptions[0].value);
            }
          }}
        />
        <button
          type="button"
          className="multi-combobox-toggle"
          aria-label={`${isOpen ? 'Fechar' : 'Abrir'} opções de ${label.toLowerCase()}`}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.stopPropagation();
            setIsOpen((current) => !current);
            inputRef.current?.focus();
          }}
        >
          {isOpen ? <X size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {isOpen && !disabled && (
        <div className="multi-combobox-listbox" id={listboxId} role="listbox" aria-multiselectable="true">
          <button
            type="button"
            className={cx('multi-combobox-option', values.length === 0 && 'is-selected')}
            role="option"
            aria-selected={values.length === 0}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onValuesChange([]);
              setQuery('');
            }}
          >
            <span>{allOptionLabel}</span>
            {values.length === 0 && <Check size={16} />}
          </button>
          {filteredOptions.map((option) => (
            <button
              type="button"
              className={cx('multi-combobox-option', selectedValues.has(option.value) && 'is-selected')}
              key={option.value}
              role="option"
              aria-selected={selectedValues.has(option.value)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => toggleValue(option.value)}
            >
              <span>{option.label}</span>
              {selectedValues.has(option.value) && <Check size={16} />}
            </button>
          ))}
          {!filteredOptions.length && <div className="combobox-empty">{noOptionsLabel}</div>}
        </div>
      )}
    </div>
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
