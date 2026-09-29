import type { AgendaRecipientSearch } from './useAgendaRecipients';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import {
  ChevronLeft,
} from 'lucide-react';
import type { AgendaMedicalUser, AgendaNotificationRecipientOptions } from '../../types';
import { Button, FormPanel } from '../../shared/components/ui';
import { AgendaReminderSettings } from './AgendaReminderSettings';
import { AgendaRecipients } from './AgendaRecipients';
import { AgendaFormActions } from './AgendaFormActions';
import { AgendaScheduleFields } from './AgendaScheduleFields';
import type { AgendaFieldErrors, AgendaScheduleField } from './agendaDateTime';
import type { AgendaFormData } from './agendaUtils';

type AgendaEventFormProps = {
  editingEventId: number | null;
  formData: AgendaFormData;
  formLoading: boolean;
  fieldErrors: AgendaFieldErrors;
  onScheduleChange: (field: AgendaScheduleField, value: string) => void;
  medicalUsers: AgendaMedicalUser[];
  notificationRecipientOptions: AgendaNotificationRecipientOptions | null;
  notificationRecipientsLoading: boolean;
  notificationRecipientsError: string;
  recipientSearch?: AgendaRecipientSearch;
  setFormData: Dispatch<SetStateAction<AgendaFormData>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOpenCalendarSection: () => void;
  onResetForm: () => void;
  onToggleNotificationUser: (userId: number) => void;
  onToggleNotificationGroup: (groupId: number) => void;
};

export function AgendaEventForm({
  editingEventId,
  formData,
  formLoading,
  fieldErrors,
  onScheduleChange,
  medicalUsers,
  notificationRecipientOptions,
  notificationRecipientsLoading,
  notificationRecipientsError,
  recipientSearch,
  setFormData,
  onSubmit,
  onOpenCalendarSection,
  onResetForm,
  onToggleNotificationUser,
  onToggleNotificationGroup,
}: AgendaEventFormProps) {
  const cancel = () => { onResetForm(); onOpenCalendarSection(); };
  return <FormPanel className="agenda-form-panel" data-tour="agenda-form">
    <div className="panel-title">
      <div><span className="eyebrow">{editingEventId ? 'Edição' : 'Cadastro'}</span>
        <h2>{editingEventId ? 'Editar evento' : 'Novo evento'}</h2></div>
      <Button type="button" variant="ghost" onClick={onOpenCalendarSection} disabled={formLoading}>
        <ChevronLeft size={17} />Calendário
      </Button>
    </div>
    <form className="stack agenda-form" onSubmit={onSubmit} noValidate aria-busy={formLoading}>
      <AgendaScheduleFields formData={formData} errors={fieldErrors} onChange={onScheduleChange}
        onAllDayChange={value => setFormData(current => ({ ...current, isAllDay: value }))}
        onDescriptionChange={value => setFormData(current => ({ ...current, description: value }))} />
      <AgendaReminderSettings formData={formData} medicalUsers={medicalUsers} setFormData={setFormData} />
      <AgendaRecipients recipientSearch={recipientSearch} editing={Boolean(editingEventId)} formData={formData} setFormData={setFormData}
        notificationRecipientOptions={notificationRecipientOptions} notificationRecipientsLoading={notificationRecipientsLoading}
        notificationRecipientsError={notificationRecipientsError} onToggleNotificationUser={onToggleNotificationUser}
        onToggleNotificationGroup={onToggleNotificationGroup} />
      <AgendaFormActions editing={Boolean(editingEventId)} loading={formLoading} onCancel={cancel} />
    </form>
  </FormPanel>;
}
