import { CalendarDays } from 'lucide-react';
import { useEffect, useRef } from 'react';
import {
  formatDateInput,
  fromDatePickerValue,
  getTodayPickerValue,
  toDatePickerValue,
} from '../utils/formatters';

type DateInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
};

export function DateInput({
  id,
  label,
  value,
  onChange,
  className,
  min,
  max = getTodayPickerValue(),
  required = false,
  disabled = false,
  error,
}: DateInputProps) {
  const textInput = useRef<HTMLInputElement>(null);
  const errorId = error ? `${id}-error` : undefined;
  useEffect(() => { textInput.current?.setCustomValidity(error ?? ''); }, [error]);

  return (
    <div className={['date-field', className].filter(Boolean).join(' ')}>
      <label htmlFor={id}>{label}</label>
      <div className="date-input-control">
        <input
          id={id}
          ref={textInput}
          type="text"
          value={value}
          onChange={(event) => onChange(formatDateInput(event.target.value))}
          inputMode="numeric"
          maxLength={10}
          placeholder="dd/mm/yyyy"
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
        />
        <span className="date-picker-button" title={`Selecionar ${label.toLowerCase()}`}>
          <CalendarDays size={17} />
          <input
            type="date"
            value={toDatePickerValue(value)}
            onChange={(event) => onChange(fromDatePickerValue(event.target.value))}
            min={min ? toDatePickerValue(min) : undefined}
            max={max ? toDatePickerValue(max) : undefined}
            aria-label={`Selecionar ${label.toLowerCase()}`}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
          />
        </span>
      </div>
      {error && <small id={errorId} role="alert" className="date-field-error">{error}</small>}
    </div>
  );
}
