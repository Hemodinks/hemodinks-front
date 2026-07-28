import {
  completeAgendaEvent,
  createAgendaEvent,
  deleteAgendaEvent,
  getAgendaEvents,
  getAgendaMedicalUsers,
  getAgendaNotificationRecipientOptions,
  getBrazilPublicHolidays,
  updateAgendaEvent,
} from '../../services';
import type { AgendaEventPayload } from './agendaTypes';

export function useAgendaGateway(token: string) {
  return {
    list: (start: string, end: string) => getAgendaEvents(token, start, end),
    listHolidays: getBrazilPublicHolidays,
    listMedicalUsers: () => getAgendaMedicalUsers(token),
    listNotificationRecipients: () => getAgendaNotificationRecipientOptions(token),
    create: (payload: AgendaEventPayload) => createAgendaEvent(payload, token),
    update: (id: number, payload: AgendaEventPayload) => updateAgendaEvent(id, payload, token),
    complete: (id: number) => completeAgendaEvent(id, token),
    delete: (id: number) => deleteAgendaEvent(id, token),
  };
}
