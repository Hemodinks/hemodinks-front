import { useId } from 'react';
import { SURGERY_TYPE_OPTIONS, type TipoCirurgia } from '../surgeryType';
import { SelectField } from './ui';
import './SurgeryTypeField.css';

type Props = {
  value?: TipoCirurgia;
  onChange: (value: TipoCirurgia) => void;
  disabled?: boolean;
};

export function SurgeryTypeField({ value, onChange, disabled }: Props) {
  const name = useId();
  return <fieldset className="surgery-type-field" disabled={disabled}>
    <legend>Tipo de cirurgia</legend>
    <div className="surgery-type-options">
      {SURGERY_TYPE_OPTIONS.map((option) => <label key={option.value}>
        <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
        {option.label}
      </label>)}
    </div>
  </fieldset>;
}

type FilterProps = {
  value?: TipoCirurgia | '';
  onChange: (value: TipoCirurgia | '') => void;
  className?: string;
};

export function SurgeryTypeFilter({ value = '', onChange, className }: FilterProps) {
  return <SelectField label="Tipo de cirurgia" value={value} className={className} onChange={(event) => onChange(event.target.value as TipoCirurgia | '')}>
    <option value="">Todos</option>
    {SURGERY_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </SelectField>;
}
