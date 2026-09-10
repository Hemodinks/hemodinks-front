import { useCallback, useEffect, useRef, useState } from 'react';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { API_READ_TIMEOUT_MS, ApiError } from '../../services/api';

export const BOOTSTRAP_TIMEOUT_MS = API_READ_TIMEOUT_MS;
const SLOW_MS = 12_000;
const RETRY_MS = 35_000;

export function bootstrapErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Credenciais invalidas ou sessao expirada.';
    if (error.status === 403) return 'Operação não permitida.';
    if (error.status === 400) return 'Não foi possível validar o contexto da clínica. Entre novamente.';
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'A conexão demorou demais. Tente novamente.';
    if (!error.status || [502, 503, 504].includes(error.status)) return 'Sistema temporariamente indisponível. Tente novamente.';
  }
  return 'Não foi possível preparar seu acesso. Tente novamente.';
}

// Only idempotent bootstrap reads. No cache, polling or automatic retry.
export function useBootstrapRequest<T>(
  enabled: boolean,
  request: (signal: AbortSignal) => Promise<T>,
  stage: 'public_clinics' | 'session_clinic_legal',
) {
  const [state, setState] = useState({ data: null as T | null, loading: enabled, slow: false, canRetry: false, error: '' });
  const active = useRef<{ cancel: () => void; retryAllowed: boolean } | null>(null);

  const retry = useCallback(async () => {
    if (!enabled || (active.current && !active.current.retryAllowed)) return;
    active.current?.cancel();
    const controller = new AbortController();
    const span = trace.getTracer('hemodinks-bootstrap').startSpan(`bootstrap.${stage}`);
    const started = performance.now();
    let finished = false;
    let slowTimer: ReturnType<typeof setTimeout>;
    let retryTimer: ReturnType<typeof setTimeout>;
    let deadline: ReturnType<typeof setTimeout>;
    const finish = (outcome: string) => {
      if (finished) return false;
      finished = true;
      clearTimeout(slowTimer); clearTimeout(retryTimer); clearTimeout(deadline);
      span.setAttributes({ 'bootstrap.outcome': outcome, 'bootstrap.duration_ms': performance.now() - started });
      if (outcome === 'error' || outcome === 'timeout') span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      return true;
    };
    const attempt = { retryAllowed: false, cancel: () => { finish('cancelled'); controller.abort(); } };
    active.current = attempt;
    setState({ data: null, loading: true, slow: false, canRetry: false, error: '' });
    slowTimer = setTimeout(() => setState(s => ({ ...s, slow: true })), SLOW_MS);
    retryTimer = setTimeout(() => {
      attempt.retryAllowed = true;
      setState(s => ({ ...s, canRetry: true }));
    }, RETRY_MS);
    deadline = setTimeout(() => {
      if (!finish('timeout')) return;
      controller.abort();
      active.current = null;
      setState({ data: null, loading: false, slow: false, canRetry: true, error: bootstrapErrorMessage(new ApiError('', undefined, 'ETIMEDOUT')) });
    }, BOOTSTRAP_TIMEOUT_MS);
    try {
      const data = await request(controller.signal);
      if (!finish('success')) return;
      active.current = null;
      setState({ data, loading: false, slow: false, canRetry: false, error: '' });
    } catch (error) {
      if (!finished && error instanceof ApiError && error.status) {
        span.setAttribute('http.response.status_code', error.status);
      }
      if (!finish('error')) return;
      active.current = null;
      setState({ data: null, loading: false, slow: false, canRetry: true, error: bootstrapErrorMessage(error) });
    }
  }, [enabled, request, stage]);

  useEffect(() => {
    if (enabled) void retry();
    else setState({ data: null, loading: false, slow: false, canRetry: false, error: '' });
    return () => { active.current?.cancel(); active.current = null; };
  }, [enabled, retry]);

  return { ...state, retry };
}
