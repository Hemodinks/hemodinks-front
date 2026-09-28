import type { Dispatch, SetStateAction } from 'react';
import type { AgendaNotificationRecipientOptions } from '../../types';
import { CheckboxField, TextareaField } from '../../shared/components/ui';
import { formatPersonName, formatProfileName } from '../../shared/utils/formatters';
import type { AgendaFormData } from './agendaUtils';

type Props = {
  formData: AgendaFormData; setFormData: Dispatch<SetStateAction<AgendaFormData>>;
  notificationRecipientOptions: AgendaNotificationRecipientOptions | null;
  notificationRecipientsLoading: boolean; notificationRecipientsError: string;
  onToggleNotificationUser: (id: number) => void; onToggleNotificationGroup: (id: number) => void;
};
export function AgendaRecipients({ formData, setFormData, notificationRecipientOptions,
  notificationRecipientsLoading, notificationRecipientsError, onToggleNotificationUser, onToggleNotificationGroup }: Props) {
  return <fieldset className="agenda-form-section agenda-notification-section" data-tour="agenda-notifications">
    <legend>Destinatários</legend>
    <TextareaField label="Mensagem da notificação" value={formData.notificationMessage}
      onValueChange={value => setFormData(current => ({ ...current, notificationMessage: value.slice(0, 500) }))}
      maxLength={500} placeholder="Explique a reunião, evento, auditoria ou videoconferência." />
    {notificationRecipientOptions ? (
      <>
        <CheckboxField
          label={notificationRecipientOptions.allRecipientsLabel}
          checked={formData.notifyAllAllowedRecipients}
          onCheckedChange={(checked) => setFormData((current) => ({ ...current, notifyAllAllowedRecipients: checked }))}
        />

        {notificationRecipientOptions.users.length > 0 && (
          <div className="agenda-recipient-group">
            <strong>Destinatários individuais</strong>
            <div className="agenda-recipient-list">
              {notificationRecipientOptions.users.map((user) => (
                <CheckboxField
                  key={user.id}
                  label={`${formatPersonName(user.nome)} (${formatProfileName(user.perfilId, user.perfilNome)})`}
                  checked={formData.notificationUserIds.includes(user.id)}
                  onCheckedChange={() => onToggleNotificationUser(user.id)}
                />
              ))}
            </div>
          </div>
        )}

        {notificationRecipientOptions.groups.length > 0 && (
          <div className="agenda-recipient-group">
            <strong>Grupos médicos</strong>
            <div className="agenda-recipient-list">
              {notificationRecipientOptions.groups.map((group) => (
                <CheckboxField
                  key={group.id}
                  label={`${group.nome} (${group.membrosCount})`}
                  checked={formData.notificationGroupIds.includes(group.id)}
                  onCheckedChange={() => onToggleNotificationGroup(group.id)}
                />
              ))}
            </div>
          </div>
        )}
      </>
    ) : notificationRecipientsError ? (
      <p className="agenda-empty agenda-empty-error">
        Não foi possível carregar os destinatários. {notificationRecipientsError}
      </p>
    ) : notificationRecipientsLoading ? (
      <p className="agenda-empty">Carregando destinatários disponíveis...</p>
    ) : (
      <p className="agenda-empty">Nenhum destinatário disponível.</p>
    )}
  </fieldset>;
}
