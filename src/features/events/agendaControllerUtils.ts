import type { AgendaEvent, AgendaEventPayload } from './agendaTypes';
import {
  type AgendaFormData,
  composeDateTime,
  defaultReminderMinutes,
  toDateKey,
  toTimeInput,
} from './agendaUtils';

export function buildAgendaPayload(formData: AgendaFormData): AgendaEventPayload {
  const reminderPeriod =
    formData.notifyUser || formData.notifyMedicalProfile
      ? Number(formData.reminderPeriodMinutes || defaultReminderMinutes)
      : null;

  return {
    medicalUserId:
      formData.notifyMedicalProfile && formData.medicalUserId
        ? Number(formData.medicalUserId)
        : null,
    title: formData.title.trim(),
    description: formData.description.trim() || null,
    start: composeDateTime(formData.startDate, formData.startTime).toISOString(),
    end: composeDateTime(formData.endDate, formData.endTime).toISOString(),
    notifyMedicalProfile: formData.notifyMedicalProfile,
    notifyUser: formData.notifyUser,
    reminderPeriodMinutes: reminderPeriod,
    notificationMessage: formData.notificationMessage.trim() || null,
    notifyAllAllowedRecipients: formData.notifyAllAllowedRecipients,
    notificationUserIds: formData.notificationUserIds,
    notificationGroupIds: formData.notificationGroupIds,
  };
}

export function getAgendaFormError(formData: AgendaFormData) {
  if (!formData.title.trim()) {
    return 'Informe o titulo do evento.';
  }

  if (
    composeDateTime(formData.endDate, formData.endTime) <=
    composeDateTime(formData.startDate, formData.startTime)
  ) {
    return 'A data final deve ser maior que a inicial.';
  }

  const hasNotificationMessage = formData.notificationMessage.trim().length > 0;
  const hasNotificationRecipients =
    formData.notifyAllAllowedRecipients ||
    formData.notificationUserIds.length > 0 ||
    formData.notificationGroupIds.length > 0;

  if (hasNotificationRecipients && !hasNotificationMessage) {
    return 'Informe a mensagem da notificação.';
  }

  if (hasNotificationMessage && !hasNotificationRecipients) {
    return 'Selecione ao menos um destinatário para enviar a notificação.';
  }

  return null;
}

export function buildAgendaEditForm(agendaEvent: AgendaEvent): AgendaFormData {
  const start = new Date(agendaEvent.start);
  const end = new Date(agendaEvent.end);

  return {
    title: agendaEvent.title,
    description: agendaEvent.description ?? '',
    startDate: toDateKey(start),
    startTime: toTimeInput(start),
    endDate: toDateKey(end),
    endTime: toTimeInput(end),
    notifyMedicalProfile: agendaEvent.notifyMedicalProfile,
    medicalUserId: agendaEvent.medicalUserId ? String(agendaEvent.medicalUserId) : '',
    notifyUser: agendaEvent.notifyUser,
    reminderPeriodMinutes: String(agendaEvent.reminderPeriodMinutes ?? defaultReminderMinutes),
    notificationMessage: '',
    notifyAllAllowedRecipients: false,
    notificationUserIds: [],
    notificationGroupIds: [],
  };
}

export function toggleAgendaSelection(selection: number[], id: number) {
  return selection.includes(id) ? selection.filter((item) => item !== id) : [...selection, id];
}
