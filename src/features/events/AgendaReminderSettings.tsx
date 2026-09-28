import type { Dispatch, SetStateAction } from 'react';
import type { AgendaMedicalUser } from '../../types';
import { CheckboxField, SelectField } from '../../shared/components/ui';
import { formatPersonName } from '../../shared/utils/formatters';
import type { AgendaFormData } from './agendaUtils';

type Props = { formData: AgendaFormData; medicalUsers: AgendaMedicalUser[]; setFormData: Dispatch<SetStateAction<AgendaFormData>> };
export function AgendaReminderSettings({ formData, medicalUsers, setFormData }: Props) {
  return <fieldset className="agenda-form-section">
    <legend>Notificações e lembretes</legend>
    <CheckboxField
      label="Notificar perfil médico"
      checked={formData.notifyMedicalProfile}
      onCheckedChange={(checked) => setFormData((current) => ({ ...current, notifyMedicalProfile: checked }))}
    />

    {formData.notifyMedicalProfile && (
      <SelectField
        label="Médico"
        value={formData.medicalUserId}
        onChange={(event) => setFormData((current) => ({ ...current, medicalUserId: event.target.value }))}
      >
        <option value="">Perfil médico</option>
        {medicalUsers.map((user) => (
          <option key={user.id} value={user.id}>{formatPersonName(user.nome)}</option>
        ))}
      </SelectField>
    )}

    <CheckboxField
      label="Receber lembretes"
      checked={formData.notifyUser}
      onCheckedChange={(checked) => setFormData((current) => ({ ...current, notifyUser: checked }))}
    />

    {(formData.notifyUser || formData.notifyMedicalProfile) && (
      <SelectField
        label="Intervalo de lembretes"
        value={formData.reminderPeriodMinutes}
        onChange={(event) => setFormData((current) => ({ ...current, reminderPeriodMinutes: event.target.value }))}
      >
        <option value="60">A cada 1 hora</option>
        <option value="360">A cada 6 horas</option>
        <option value="720">A cada 12 horas</option>
        <option value="1440">A cada 1 dia</option>
        <option value="2880">A cada 2 dias</option>
      </SelectField>
    )}
  </fieldset>;
}
