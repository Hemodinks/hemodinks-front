import { useEffect, useRef, useState } from 'react';
import type { AuthSession } from '../../types';
import { getEventEmailNotification, queueEventEmailNotification } from '../../services/eventEmailService';
import { sessionEpoch } from '../../services/sessionEpoch';
import { getErrorMessage } from '../../shared/utils/formatters';
import type { EventEmailPreview, EventEmailQueueResult } from '../../types/eventEmail';

export function useAgendaEventEmail(eventId: number, session: AuthSession) {
  const scope = eventId + ':' + session.user.clinicaId + ':' + session.user.id + ':' + session.token;
  const [selection, setSelection] = useState({ scope, value: false });
  const copyToCreator = selection.scope === scope && selection.value;
  const [preview, setPreview] = useState<EventEmailPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EventEmailQueueResult | null>(null);
  const [attemptedScope, setAttemptedScope] = useState('');
  const [revision, setRevision] = useState(0);
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const loadedContext = useRef('');
  const context = scope + ':' + copyToCreator;
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const attempted = useRef(false);
  const requestKey = useRef('');
  const keyContext = useRef('');
  const previousScope = useRef('');
  const openedEpoch = useRef(sessionEpoch());

  useEffect(() => {
    mounted.current = true;
    setPreview(null); setError(''); setLoading(true);
    loadedContext.current = '';
    if (previousScope.current !== scope) {
      previousScope.current = scope;
      setResult(null); setSubmitting(false); setAttemptedScope('');
      inFlight.current = false; attempted.current = false;
    }
    // Refreshing status after an uncertain POST must retain both key and payload.
    if (keyContext.current !== context) {
      keyContext.current = context;
      requestKey.current = crypto.randomUUID();
    }
    const controller = new AbortController();
    const epoch = sessionEpoch();
    openedEpoch.current = epoch;
    let cancelled = false;
    const current = () => !cancelled && activeScope.current === scope && sessionEpoch() === epoch;
    void getEventEmailNotification(eventId, session.token, controller.signal, copyToCreator)
      .then(data => { if (current()) { loadedContext.current = context; setPreview(data); } })
      .catch(caught => { if (current()) setError(getErrorMessage(caught)); })
      .finally(() => { if (current()) setLoading(false); });
    return () => { cancelled = true; mounted.current = false; controller.abort(); };
  }, [scope, context, eventId, session.token, revision, copyToCreator]);

  const setCopyToCreator = (value: boolean) => {
    if (attempted.current || inFlight.current || loading || loadedContext.current !== context
      || sessionEpoch() !== openedEpoch.current || (value && !preview?.creatorCopy?.canSend)) return;
    loadedContext.current = '';
    setSelection({ scope, value });
  };

  const send = async () => {
    if (!mounted.current || activeScope.current !== scope || loadedContext.current !== context
      || loading || inFlight.current || !preview?.canSend || result) return;
    const epoch = sessionEpoch();
    if (epoch !== openedEpoch.current) return;
    attempted.current = true; setAttemptedScope(scope);
    inFlight.current = true; setSubmitting(true); setError('');
    const current = () => mounted.current && activeScope.current === scope && sessionEpoch() === epoch;
    try {
      const queued = await queueEventEmailNotification(eventId, session.token, requestKey.current, copyToCreator);
      if (!current()) return;
      setResult(queued);
      const refreshed = await getEventEmailNotification(eventId, session.token, undefined, copyToCreator);
      if (current()) setPreview(refreshed);
    } catch (caught) {
      if (current()) setError(getErrorMessage(caught));
    } finally {
      if (current()) { inFlight.current = false; setSubmitting(false); }
    }
  };

  const sameScope = previousScope.current === scope;
  return { preview: sameScope ? preview : null, loading: !sameScope || loading,
    submitting: sameScope && submitting, error: sameScope ? error : '', result: sameScope ? result : null,
    copyToCreator, setCopyToCreator, copyLocked: attemptedScope === scope,
    send, retry: () => { if (!inFlight.current) setRevision(value => value + 1); } };
}
