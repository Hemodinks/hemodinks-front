import { CalendarDays } from 'lucide-react';
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
  required?: boolean;
};

export function DateInput({ id, label, value, onChange, required = false }: DateInputProps) {
  return (
    <div className="date-field">
      <label htmlFor={id}>{label}</label>
      <div className="date-input-control">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(formatDateInput(event.target.value))}
          inputMode="numeric"
          maxLength={10}
          placeholder="dd/mm/yyyy"
          required={required}
        />
        <span className="date-picker-button" title={`Selecionar ${label.toLowerCase()}`}>
          <CalendarDays size={17} />
          <input
            type="date"
            value={toDatePickerValue(value)}
            onChange={(event) => onChange(fromDatePickerValue(event.target.value))}
            max={getTodayPickerValue()}
            aria-label={`Selecionar ${label.toLowerCase()}`}
          />
        </span>
      </div>
    </div>
  );
}
