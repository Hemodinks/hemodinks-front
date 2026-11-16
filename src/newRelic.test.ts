import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const agent = vi.hoisted(() => ({
  options: null as null | { init: Record<string, unknown> },
  setErrorHandler: vi.fn(),
  noticeError: vi.fn(),
}));

vi.mock('@newrelic/browser-agent/loaders/browser-agent', () => ({
  BrowserAgent: vi.fn(function BrowserAgent(this: unknown, options: { init: Record<string, unknown> }) {
    agent.options = options;
    return { setErrorHandler: agent.setErrorHandler, noticeError: agent.noticeError };
  }),
}));

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJh';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  for (const [key, value] of Object.entries({
    VITE_NEW_RELIC_APPLICATION_ID: 'app', VITE_NEW_RELIC_AGENT_ID: 'agent', VITE_NEW_RELIC_ACCOUNT_ID: '1',
    VITE_NEW_RELIC_LICENSE_KEY: 'license',
  })) vi.stubEnv(key, value);
});

let stop: (() => void) | null = null;

afterEach(() => {
  stop?.();
  stop = null;
  vi.unstubAllEnvs();
});

async function start() {
  const newRelic = await import('./newRelic');
  stop = newRelic.stopNewRelicErrorReporting;
  newRelic.initNewRelicBrowser();
  const ignore = agent.setErrorHandler.mock.calls[0][0] as (error: unknown) => boolean;
  return { newRelic, ignore };
}

it('habilita jserrors com obfuscate de URL, CPF, e-mail, token e GUID', async () => {
  await start();
  const init = agent.options!.init as { jserrors: { enabled: boolean }; obfuscate: { regex: RegExp; replacement: string }[] };

  expect(init.jserrors.enabled).toBe(true);
  expect(init.obfuscate.map((rule) => rule.replacement)).toEqual(
    ['[url]', '[url]', 'Bearer [token]', '[token]', '[email]', '[id]', '[cpf]']);
});

it('descarta a captura automática crua e só deixa sair o erro sanitizado', async () => {
  const { ignore } = await start();
  const raw = new Error(`token ${JWT} cpf 123.456.789-09`);

  expect(ignore(raw)).toBe(true);
  expect(ignore('string error')).toBe(true);

  window.dispatchEvent(new ErrorEvent('error', { error: raw, message: raw.message }));

  expect(agent.noticeError).toHaveBeenCalledOnce();
  const [sent, attributes] = agent.noticeError.mock.calls[0];
  expect(attributes).toEqual({ source: 'window-error' });
  expect(sent.message).toBe('Error');
  expect(`${sent.stack}`).not.toContain(JWT);
  expect(`${sent.stack}`).not.toContain('123.456.789-09');
  expect(ignore(sent)).toBe(false);
});

it('após revogar o consentimento nenhum erro sai', async () => {
  const { newRelic, ignore } = await start();
  const { reportError } = await import('./errorReporting');
  reportError(new Error('antes'), 'error-boundary');
  const [sent] = agent.noticeError.mock.calls[0];

  newRelic.stopNewRelicErrorReporting();
  reportError(new Error('depois'), 'error-boundary');
  window.dispatchEvent(new ErrorEvent('error', { message: 'janela' }));

  expect(agent.noticeError).toHaveBeenCalledOnce();
  expect(ignore(sent)).toBe(true);
});
