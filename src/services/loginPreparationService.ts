import { apiClient } from './api';

const SUCCESS_KEY = 'hemodinks-login-ready-at';
const VALID_FOR_MS = 5 * 60_000;
let readyAt = 0;
let pending: { controller: AbortController; promise: Promise<void> } | null = null;

export function isLoginPreparationEnabled() {
  const setting = import.meta.env.VITE_LOGIN_PREPARATION_ENABLED;
  if (setting !== undefined) return setting === 'true';
  return ['hemodinks-homologacao.gestao-saude.tec.br', 'hemodinks-homologacao.vercel.app']
    .includes(window.location.hostname);
}

function isReady() {
  try { readyAt = Math.max(readyAt, Number(sessionStorage.getItem(SUCCESS_KEY)) || 0); } catch { /* memory fallback */ }
  const age = Date.now() - readyAt;
  return readyAt > 0 && age >= 0 && age < VALID_FOR_MS;
}

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
}

export async function warmLoginApi(signal?: AbortSignal): Promise<void> {
  checkAbort(signal);
  if (isReady()) return;
  if (!pending) {
    const controller = new AbortController();
    const promise = apiClient.get('/api/warmup', {
      timeout: 60_000, withCredentials: false, signal: controller.signal,
    }).then(response => {
      checkAbort(controller.signal);
      if (response.status !== 204) throw new Error('Warmup unavailable');
      readyAt = Date.now();
      try { sessionStorage.setItem(SUCCESS_KEY, String(readyAt)); } catch { /* memory fallback */ }
    });
    pending = { controller, promise };
  }
  const current = pending;
  const cancel = () => current.controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    await current.promise;
    checkAbort(signal);
  } finally {
    signal?.removeEventListener('abort', cancel);
    if (pending === current) pending = null;
  }
}

function delay(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
    const timer = window.setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, 5_000);
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
  });
}

export async function prepareLoginApi(signal: AbortSignal) {
  for (let attempt = 0; attempt < 3; attempt++) {
    checkAbort(signal);
    try { await warmLoginApi(signal); return; }
    catch (error) {
      checkAbort(signal);
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (attempt === 2 || (status !== undefined && status < 500 && status !== 408)) break;
      await delay(signal);
    }
  }
  throw new Error('Não foi possível preparar o ambiente de homologação. Nenhuma credencial foi enviada. Aguarde um pouco e tente entrar novamente.');
}
