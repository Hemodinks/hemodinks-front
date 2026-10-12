import { useEffect, useRef, useState } from 'react';
import type { AuthSession } from '../../types';
import { getEventEmailNotification, queueEventEmailNotification } from '../../services/eventEmailService';
import { sessionEpoch } from '../../services/sessionEpoch';
import { getErrorMessage } from '../../shared/utils/formatters';
import type { EventEmailPreview, EventEmailQueueResult } from '../../types/eventEmail';

export function useAgendaEventEmail(eventId: number, session: AuthSession) {
  const [preview, setPreview] = useState<EventEmailPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EventEmailQueueResult | null>(null);
  const [revision, setRevision] = useState(0);
  const scope = eventId + ':' + session.user.clinicaId + ':' + session.user.id + ':' + session.token;
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const requestKey = useRef('');
  const openedEpoch = useRef(sessionEpoch());

  useEffect(() => {
    mounted.current = true;
    setPreview(null); setResult(null); setError(''); setLoading(true); setSubmitting(false);
    inFlight.current = false;
    requestKey.current = crypto.randomUUID();
    const controller = new AbortController();
    const epoch = sessionEpoch();
    openedEpoch.current = epoch;
    let cancelled = false;
    const current = () => !cancelled && activeScope.current === scope && sessionEpoch() === epoch;
    void getEventEmailNotification(eventId, session.token, controller.signal)
      .then(data => { if (current()) setPreview(data); })
      .catch(caught => { if (current()) setError(getErrorMessage(caught)); })
      .finally(() => { if (current()) setLoading(false); });
    return () => { cancelled = true; mounted.current = false; controller.abort(); };
  }, [scope, eventId, session.token, revision]);

  const send = async () => {
    if (!mounted.current || activeScope.current !== scope || loading || inFlight.current || !preview?.canSend || result) return;
    const epoch = sessionEpoch();
    // A session change must invalidate even an already displayed confirmation.
    if (epoch !== openedEpoch.current) return;
    inFlight.current = true; setSubmitting(true); setError('');
    const current = () => mounted.current && activeScope.current === scope && sessionEpoch() === epoch;
    try {
      const queued = await queueEventEmailNotification(eventId, session.token, requestKey.current);
      if (!current()) return;
      setResult(queued);
      const refreshed = await getEventEmailNotification(eventId, session.token);
      if (current()) setPreview(refreshed);
    } catch (caught) {
      if (current()) setError(getErrorMessage(caught));
    } finally {
      if (current()) { inFlight.current = false; setSubmitting(false); }
    }
  };

  return { preview, loading, submitting, error, result, send, retry: () => setRevision(value => value + 1) };
}
