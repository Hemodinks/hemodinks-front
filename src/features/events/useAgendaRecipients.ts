import { useEffect, useRef, useState } from 'react';
import { getAgendaMedicalUsers, getAgendaNotificationRecipientOptions } from '../../services';
import type { AgendaMedicalUser, AgendaNotificationRecipientOptions, AuthSession } from '../../types';
import { getErrorMessage } from '../../shared/utils/formatters';

export type AgendaRecipientSearch = {
  search: string; profile: string; page: number;
  setSearch: (value: string) => void; setProfile: (value: string) => void; setPage: (value: number) => void;
};
type RecipientState = {
  key: string; medicalUsers: AgendaMedicalUser[];
  options: AgendaNotificationRecipientOptions | null; loading: boolean; error: string;
};
export function useAgendaRecipients(session: AuthSession) {
  const scope = `${session.user.clinicaId}:${session.user.id}:${session.token}`;
  const [query, setQuery] = useState({ scope, search: '', profile: 'all', page: 1 });
  const currentQuery = query.scope === scope ? query : { scope, search: '', profile: 'all', page: 1 };
  const [debounced, setDebounced] = useState({ scope, search: '' });
  const search = debounced.scope === scope ? debounced.search : '';
  useEffect(() => {
    const timer = setTimeout(() => setDebounced({ scope, search: currentQuery.search }), 300);
    return () => clearTimeout(timer);
  }, [scope, currentQuery.search]);
  const { profile, page } = currentQuery;
  const key = JSON.stringify([scope, search, profile, page]);
  const medicalRequest = useRef<{ scope: string; promise: Promise<AgendaMedicalUser[]> } | null>(null);
  const [state, setState] = useState<RecipientState>({ key: '', medicalUsers: [], options: null, loading: true, error: '' });
  useEffect(() => {
    let active = true;
    if (medicalRequest.current?.scope !== scope)
      medicalRequest.current = { scope, promise: getAgendaMedicalUsers(session.token) };
    setState({ key, medicalUsers: [], options: null, loading: true, error: '' });
    void Promise.all([medicalRequest.current.promise, getAgendaNotificationRecipientOptions(session.token, { search, profile, page })])
      .then(([medicalUsers, options]) => {
        if (active) setState({ key, medicalUsers, options, loading: false, error: '' });
      }).catch(error => {
        if (active) setState({ key, medicalUsers: [], options: null, loading: false, error: getErrorMessage(error) });
      });
    return () => { active = false; };
  }, [key, scope, search, profile, page, session.token]);
  const current = state.key === key ? state : { medicalUsers: [], options: null, loading: true, error: '' };
  const recipientSearch: AgendaRecipientSearch = {
    search: currentQuery.search, profile, page,
    setSearch: value => setQuery({ ...currentQuery, search: value, page: 1 }),
    setProfile: value => setQuery({ ...currentQuery, profile: value, page: 1 }),
    setPage: value => setQuery({ ...currentQuery, page: value }),
  };
  return { medicalUsers: current.medicalUsers, notificationRecipientOptions: current.options,
    notificationRecipientsLoading: current.loading, notificationRecipientsError: current.error, recipientSearch };
}
