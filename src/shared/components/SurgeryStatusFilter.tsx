import { SURGERY_STATUS_OPTIONS, type StatusCirurgia } from '../surgeryStatus';
import { SelectField } from './ui';

type Props = {
  value?: StatusCirurgia | '';
  onChange: (value: StatusCirurgia | '') => void;
  className?: string;
};

export function SurgeryStatusFilter({ value = '', onChange, className }: Props) {
  return <SelectField label="Status da cirurgia" value={value} className={className} onChange={(event) => onChange(event.target.value as StatusCirurgia | '')}>
    <option value="">Todas</option>
    {SURGERY_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.filterLabel}</option>)}
  </SelectField>;
}
