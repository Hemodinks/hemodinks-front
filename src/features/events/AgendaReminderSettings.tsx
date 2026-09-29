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
      label="Enviar lembretes aos médicos"
      checked={formData.notifyMedicalProfile}
      onCheckedChange={(checked) => setFormData((current) => ({ ...current, notifyMedicalProfile: checked }))}
    />

    {formData.notifyMedicalProfile && (
      <SelectField
        label="Médicos que receberão lembretes"
        value={formData.medicalUserId}
        onChange={(event) => setFormData((current) => ({ ...current, medicalUserId: event.target.value }))}
      >
        <option value="">Todos os médicos disponíveis para você</option>
        {medicalUsers.map((user) => (
          <option key={user.id} value={user.id}>{formatPersonName(user.nome)}</option>
        ))}
      </SelectField>
    )}

    <p>Os lembretes médicos alcançam apenas médicos ativos da clínica. No acesso por equipe, apenas médicos da equipe.</p>
    <CheckboxField
      label="Receber lembretes"
      checked={formData.notifyUser}
      onCheckedChange={(checked) => setFormData((current) => ({ ...current, notifyUser: checked }))}
    />

    {(formData.notifyUser || formData.notifyMedicalProfile) && (
      <div className="agenda-reminder-details">
      <p><strong>Início dos lembretes: 2 dias antes do evento.</strong> Se essa data já passou, o envio começa no próximo processamento. Os lembretes se repetem até o evento ser concluído.</p>
      {formData.isAllDay && <p>Para dia inteiro, o início é o primeiro instante válido da data no fuso {formData.timeZoneId}. A antecedência continua sendo de 48 horas.</p>}
      {!formData.notifyUser && <p>Você não receberá lembretes. A repetição abaixo continua ativa para os médicos escolhidos.</p>}
      <SelectField
        label="Repetir lembrete"
        value={formData.reminderPeriodMinutes}
        onChange={(event) => setFormData((current) => ({ ...current, reminderPeriodMinutes: event.target.value }))}
      >
        <option value="15">A cada 15 minutos</option>
        <option value="60">A cada 1 hora</option>
        <option value="360">A cada 6 horas</option>
        <option value="720">A cada 12 horas</option>
        <option value="1440">A cada 1 dia</option>
        <option value="2880">A cada 2 dias</option>
        <option value="10080">A cada 7 dias</option>
        {formData.reminderPeriodMinutes && !['15', '60', '360', '720', '1440', '2880', '10080'].includes(formData.reminderPeriodMinutes) &&
          <option value={formData.reminderPeriodMinutes}>A cada {formData.reminderPeriodMinutes} minutos</option>}
      </SelectField>
      </div>
    )}
  </fieldset>;
}
