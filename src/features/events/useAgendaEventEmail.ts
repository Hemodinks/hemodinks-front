import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AuthSession } from '../../types';
import { getEventEmailNotification, queueEventEmailNotification } from '../../services/eventEmailService';
import { sessionEpoch } from '../../services/sessionEpoch';
import { getErrorMessage } from '../../shared/utils/formatters';
import type { EventEmailPreview, EventEmailQueueResult } from '../../types/eventEmail';

type LoadedPreview = { key: string; preview: EventEmailPreview | null; error: string };

export function useAgendaEventEmail(eventId: number, session: AuthSession) {
  const scope = eventId + ':' + session.user.clinicaId + ':' + session.user.id + ':' + session.token;
  const [selection, setSelection] = useState({ scope, value: false });
  const copyToCreator = selection.scope === scope && selection.value;
  const [submitting, setSubmitting] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [result, setResult] = useState<EventEmailQueueResult | null>(null);
  const [attemptedScope, setAttemptedScope] = useState('');
  const [revision, setRevision] = useState(0);
  const context = scope + ':' + copyToCreator;
  // #292: a prévia fica guardada com a chave pedida (contexto + revisão); "carregando" = chave diferente.
  const loadKey = context + ':' + revision;
  const [loaded, setLoaded] = useState<LoadedPreview>({ key: '', preview: null, error: '' });
  const loading = loaded.key !== loadKey;
  const preview = loading ? null : loaded.preview;
  const [sendError, setSendError] = useState('');
  const error = sendError || (loading ? '' : loaded.error);
  // Outro evento/sessão descarta o envio anterior e o erro na própria renderização (antes: no efeito).
  const [stateScope, setStateScope] = useState(scope);
  if (stateScope !== scope) {
    setStateScope(scope);
    setResult(null); setSubmitting(false); setRefreshingStatus(false); setAttemptedScope('');
  }
  const [errorFor, setErrorFor] = useState(loadKey);
  if (errorFor !== loadKey) {
    setErrorFor(loadKey);
    setSendError('');
  }

  const activeScope = useRef(scope);
  useLayoutEffect(() => { activeScope.current = scope; }, [scope]);
  const loadedContext = useRef('');
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const attempted = useRef(false);
  const requestKey = useRef('');
  const keyContext = useRef('');
  const previousScope = useRef('');
  const openedEpoch = useRef(sessionEpoch());

  useEffect(() => {
    mounted.current = true;
    loadedContext.current = '';
    if (previousScope.current !== scope) {
      previousScope.current = scope;
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
      .then(data => { if (current()) { loadedContext.current = context; setLoaded({ key: loadKey, preview: data, error: '' }); } })
      .catch(caught => { if (current()) setLoaded({ key: loadKey, preview: null, error: getErrorMessage(caught) }); });
    return () => { cancelled = true; mounted.current = false; controller.abort(); };
  }, [scope, context, eventId, session.token, revision, copyToCreator, loadKey]);

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
    inFlight.current = true; setSubmitting(true); setSendError('');
    const current = () => mounted.current && activeScope.current === scope && sessionEpoch() === epoch;
    try {
      const queued = await queueEventEmailNotification(eventId, session.token, requestKey.current, copyToCreator);
      if (!current()) return;
      setResult(queued);
      // Queue acceptance allows closing; the follow-up read must not trap the user.
      setSubmitting(false); setRefreshingStatus(true);
      const refreshed = await getEventEmailNotification(eventId, session.token, undefined, copyToCreator);
      if (current()) setLoaded(state => state.key === loadKey ? { ...state, preview: refreshed } : state);
    } catch (caught) {
      if (current()) setSendError(getErrorMessage(caught));
    } finally {
      if (current()) { inFlight.current = false; setSubmitting(false); setRefreshingStatus(false); }
    }
  };

  return { preview, loading, submitting, refreshingStatus, error, result,
    copyToCreator, setCopyToCreator, copyLocked: attemptedScope === scope,
    send, retry: () => { if (!inFlight.current) setRevision(value => value + 1); } };
}
