import { type InputHTMLAttributes, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

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
  const fieldRef = useRef<HTMLLabelElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const uniqueOptions = [...new Set(options.map((option) => option.trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }),
  );
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
            if (!disabled) setIsOpen(true);
          }}
          onChange={(event) => {
            onValueChange(event.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) =>
                filteredOptions.length
                  ? current < filteredOptions.length - 1
                    ? current + 1
                    : 0
                  : -1,
              );
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) =>
                filteredOptions.length
                  ? current > 0
                    ? current - 1
                    : filteredOptions.length - 1
                  : -1,
              );
              return;
            }
            if (
              event.key === 'Enter' &&
              isOpen &&
              activeIndex >= 0 &&
              filteredOptions[activeIndex]
            ) {
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
            if (disabled) return;
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
