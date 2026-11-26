import { useCallback, useEffect, useRef, useState } from 'react';
import { getAgendaEvents } from '../../services';
import type { AgendaEventFilters } from '../../services/eventsService';
import type { AgendaEvent, AuthSession } from '../../types';
import { getErrorMessage } from '../../shared/utils/formatters';
import { eventsInRange } from './agendaViews';

type Range = { scope: string; from: string; to: string };
type Cache = Range & { events: AgendaEvent[] };
const covers = (cached: Range | null, current: Range) => !!cached && cached.scope === current.scope
  && Date.parse(cached.from) <= Date.parse(current.from) && Date.parse(cached.to) >= Date.parse(current.to);

export function useAgendaEvents(session: AuthSession, from: string, to: string, filters: AgendaEventFilters) {
  const filterKey = JSON.stringify(filters);
  const scope = `${session.user.clinicaId}:${session.user.id}:${session.token}:${filterKey}`;
  const key = `${scope}:${from}:${to}`;
  const cache = useRef<Cache | null>(null);
  const pending = useRef<(Range & { promise: Promise<AgendaEvent[]> }) | null>(null);
  const requestId = useRef(0);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ key: '', events: [] as AgendaEvent[], loading: true, error: '' });
  const invalidateEvents = () => { cache.current = null; pending.current = null; setRevision(value => value + 1); };
  const loadEvents = useCallback(async (force = true) => {
    const id = ++requestId.current;
    const range = { scope, from, to };
    if (!force && covers(cache.current, range)) {
      setState({ key, events: eventsInRange(cache.current!.events, from, to), loading: false, error: '' });
      return;
    }
    if (force) { cache.current = null; pending.current = null; }
    setState({ key, events: [], loading: true, error: '' });
    let request = pending.current;
    if (!covers(request, range)) {
      const query: AgendaEventFilters = JSON.parse(filterKey);
      const promise = Object.keys(query).length ? getAgendaEvents(session.token, from, to, query) : getAgendaEvents(session.token, from, to);
      request = { ...range, promise }; pending.current = request;
    }
    try {
      const events = await request!.promise;
      if (id !== requestId.current) return;
      cache.current = { ...request!, events };
      setState({ key, events: eventsInRange(events, from, to), loading: false, error: '' });
    } catch (error) {
      if (id === requestId.current) setState({ key, events: [], loading: false, error: getErrorMessage(error) });
    } finally { if (pending.current === request) pending.current = null; }
  }, [key, scope, from, to, filterKey, session.token]);
  useEffect(() => { void loadEvents(false); return () => { requestId.current++; }; }, [loadEvents, revision]);
  return { events: state.key === key ? state.events : [], loading: state.key !== key || state.loading,
    eventsError: state.key === key ? state.error : '', loadEvents, invalidateEvents };
}
