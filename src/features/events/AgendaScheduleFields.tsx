import type { ComponentProps } from 'react';
import { TextField } from '../../shared/components/ui';
import type { AgendaFormData } from './agendaUtils';
import type { AgendaFieldErrors, AgendaScheduleField } from './agendaDateTime';

type Props = {
  formData: AgendaFormData;
  errors: AgendaFieldErrors;
  onChange: (field: AgendaScheduleField, value: string) => void;
  onDescriptionChange: (value: string) => void;
};

function ScheduleField({ field, error, ...props }: ComponentProps<typeof TextField> & {
  field: AgendaScheduleField; error?: string;
}) {
  const errorId = `agenda-${field}-error`;
  return <div>
    <TextField {...props} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} />
    {error && <small id={errorId} className="agenda-field-error" role="alert">{error}</small>}
  </div>;
}

export function AgendaScheduleFields({ formData, errors, onChange, onDescriptionChange }: Props) {
  return <>
    <ScheduleField field="title" label="Título" value={formData.title} maxLength={255} required
      error={errors.title} onValueChange={value => onChange('title', value.slice(0, 255))} />
    <TextField label="Descrição" value={formData.description} maxLength={2000}
      onValueChange={value => onDescriptionChange(value.slice(0, 2000))} />
    <div className="two-column-fields">
      <ScheduleField field="startDate" label="Início" type="date" value={formData.startDate} required
        error={errors.startDate} onValueChange={value => onChange('startDate', value)} />
      <ScheduleField field="startTime" label="Hora" type="time" value={formData.startTime} required
        error={errors.startTime} onValueChange={value => onChange('startTime', value)} />
    </div>
    <div className="two-column-fields">
      <ScheduleField field="endDate" label="Término" type="date" value={formData.endDate} required
        error={errors.endDate} onValueChange={value => onChange('endDate', value)} />
      <ScheduleField field="endTime" label="Hora" type="time" value={formData.endTime} required
        error={errors.endTime} onValueChange={value => onChange('endTime', value)} />
    </div>
  </>;
}
