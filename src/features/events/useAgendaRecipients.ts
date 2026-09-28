import { useEffect, useState } from 'react';
import { getAgendaMedicalUsers, getAgendaNotificationRecipientOptions } from '../../services';
import type { AgendaMedicalUser, AgendaNotificationRecipientOptions, AuthSession } from '../../types';
import { getErrorMessage } from '../../shared/utils/formatters';

type RecipientState = {
  scope: string; medicalUsers: AgendaMedicalUser[];
  options: AgendaNotificationRecipientOptions | null; loading: boolean; error: string;
};
export function useAgendaRecipients(session: AuthSession) {
  const scope = `${session.user.clinicaId}:${session.user.id}:${session.token}`;
  const [state, setState] = useState<RecipientState>({ scope: '', medicalUsers: [], options: null, loading: true, error: '' });
  useEffect(() => {
    let active = true;
    setState({ scope, medicalUsers: [], options: null, loading: true, error: '' });
    void Promise.all([getAgendaMedicalUsers(session.token), getAgendaNotificationRecipientOptions(session.token)])
      .then(([medicalUsers, options]) => {
        if (active) setState({ scope, medicalUsers, options, loading: false, error: '' });
      }).catch(error => {
        if (active) setState({ scope, medicalUsers: [], options: null, loading: false, error: getErrorMessage(error) });
      });
    return () => { active = false; };
  }, [scope, session.token]);
  const current = state.scope === scope ? state : { medicalUsers: [], options: null, loading: true, error: '' };
  return { medicalUsers: current.medicalUsers, notificationRecipientOptions: current.options,
    notificationRecipientsLoading: current.loading, notificationRecipientsError: current.error };
}
