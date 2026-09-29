import type { ComponentProps } from 'react';
import { CheckboxField, TextField } from '../../shared/components/ui';
import type { AgendaFormData } from './agendaUtils';
import type { AgendaFieldErrors, AgendaScheduleField } from './agendaDateTime';

type Props = {
  formData: AgendaFormData;
  errors: AgendaFieldErrors;
  onChange: (field: AgendaScheduleField, value: string) => void;
  onAllDayChange: (value: boolean) => void;
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

export function AgendaScheduleFields({ formData, errors, onChange, onDescriptionChange, onAllDayChange }: Props) {
  return <>
    <fieldset className="agenda-form-section" data-tour="agenda-details">
      <legend>Informações do evento</legend>
    <ScheduleField field="title" label="Título" value={formData.title} maxLength={255} required
      error={errors.title} onValueChange={value => onChange('title', value.slice(0, 255))} />
    <TextField label="Descrição" value={formData.description} maxLength={2000}
      onValueChange={value => onDescriptionChange(value.slice(0, 2000))} />
    </fieldset>
    <fieldset className="agenda-form-section">
      <legend>Data e horário</legend>
      <CheckboxField label="Evento de dia inteiro" checked={formData.isAllDay} onCheckedChange={onAllDayChange} />
      {formData.isAllDay && <p>As datas inicial e final estão incluídas. Fuso registrado para os lembretes: {formData.timeZoneId}.</p>}
    <div className="two-column-fields">
      <ScheduleField field="startDate" label="Início" type="date" value={formData.startDate} required
        error={errors.startDate} onValueChange={value => onChange('startDate', value)} />
      {!formData.isAllDay && <ScheduleField field="startTime" label="Hora" type="time" value={formData.startTime} required
        error={errors.startTime} onValueChange={value => onChange('startTime', value)} />}
    </div>
    <div className="two-column-fields">
      <ScheduleField field="endDate" label="Término" type="date" value={formData.endDate} required
        error={errors.endDate} onValueChange={value => onChange('endDate', value)} />
      {!formData.isAllDay && <ScheduleField field="endTime" label="Hora" type="time" value={formData.endTime} required
        error={errors.endTime} onValueChange={value => onChange('endTime', value)} />}
    </div>
    </fieldset>
  </>;
}
