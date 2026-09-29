import type { Dispatch, SetStateAction } from 'react';
import type { AgendaNotificationRecipientOptions } from '../../types';
import { Button, CheckboxField, SelectField, TextareaField } from '../../shared/components/ui';
import type { AgendaFormData } from './agendaUtils';
import type { AgendaRecipientSearch } from './useAgendaRecipients';
import { AgendaRecipientUsers } from './AgendaRecipientUsers';

type Props = {
  formData: AgendaFormData; setFormData: Dispatch<SetStateAction<AgendaFormData>>;
  notificationRecipientOptions: AgendaNotificationRecipientOptions | null;
  notificationRecipientsLoading: boolean; notificationRecipientsError: string;
  recipientSearch?: AgendaRecipientSearch; editing?: boolean;
  onToggleNotificationUser: (id: number) => void; onToggleNotificationGroup: (id: number) => void;
};
export function AgendaRecipients({ formData, setFormData, notificationRecipientOptions: options, recipientSearch, editing,
  notificationRecipientsLoading: loading, notificationRecipientsError: error, onToggleNotificationUser, onToggleNotificationGroup }: Props) {
  return <fieldset className="agenda-form-section agenda-notification-section" data-tour="agenda-notifications">
    <legend>Destinatários</legend>
    <p>{editing ? 'Ao salvar, uma nova mensagem será enviada aos destinatários escolhidos abaixo. Os envios anteriores são preservados.'
      : 'Envie uma mensagem aos destinatários ao criar o evento. Esta seleção é independente dos lembretes periódicos.'}</p>
    <TextareaField label="Mensagem da notificação" value={formData.notificationMessage}
      onValueChange={value => setFormData(current => ({ ...current, notificationMessage: value.slice(0, 500) }))}
      aria-describedby="agenda-message-count" maxLength={500} placeholder="Explique a reunião, evento, auditoria ou videoconferência." />
    <small id="agenda-message-count">{formData.notificationMessage.length}/500 caracteres</small>
    <SelectField label="Enviar notificação para" value={formData.notifyAllAllowedRecipients ? 'all' : 'specific'}
      onChange={event => setFormData(current => ({ ...current, notifyAllAllowedRecipients: event.target.value === 'all' }))}>
      <option value="specific">Usuários específicos</option>
      <option value="all">{options?.allRecipientsLabel || 'Todos os destinatários permitidos'}</option>
    </SelectField>
    {formData.notifyAllAllowedRecipients ? <p role="status">Todos os destinatários permitidos da clínica atual receberão a mensagem, independentemente da busca e da página.</p>
      : <AgendaRecipientUsers query={recipientSearch} options={options} selectedIds={formData.notificationUserIds}
        loading={loading} error={error} onToggle={onToggleNotificationUser} />}
    {options && options.groups.length > 0 && <div className="agenda-recipient-group">
      <strong>Grupos médicos</strong>
      <p>{formData.notificationGroupIds.length} grupos selecionados. Somente membros ativos permitidos recebem a mensagem, sem envios duplicados.</p>
      <div className="agenda-recipient-list">
        {options.groups.map(group => <CheckboxField key={group.id} label={`${group.nome} (${group.membrosCount})`}
          checked={formData.notificationGroupIds.includes(group.id)} onCheckedChange={() => onToggleNotificationGroup(group.id)} />)}
      </div>
    </div>}
    {(formData.notificationUserIds.length > 0 || formData.notificationGroupIds.length > 0) &&
      <Button type="button" variant="ghost" onClick={() => setFormData(current => ({ ...current, notificationUserIds: [], notificationGroupIds: [] }))}>Limpar seleção individual e grupos</Button>}
  </fieldset>;
}
