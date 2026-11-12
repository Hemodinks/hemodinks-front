import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { registerServiceWorker, SERVICE_WORKER_URL } from './registerServiceWorker';

const ORIGIN = 'https://hemodinks.gestao-saude.tec.br';
const read = (path: string) => readFileSync(resolve(process.cwd(), path));

type FakeResponse = { ok: boolean; type: string; headers: { get: (name: string) => string | null }; clone: () => FakeResponse };
const response = (
  cacheControl: string | null = 'public, max-age=31536000, immutable',
  ok = true,
  contentType = 'text/javascript; charset=utf-8',
): FakeResponse => {
  const headers: Record<string, string | null> = { 'cache-control': cacheControl, 'content-type': contentType };
  const self: FakeResponse = { ok, type: 'basic', headers: { get: (name) => headers[name.toLowerCase()] ?? null }, clone: () => self };
  return self;
};

// Runs public/sw.js against fake service worker globals and returns its listeners.
function loadServiceWorker(network: (url: string) => FakeResponse = () => response()) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const stores = new Map<string, Map<string, FakeResponse>>();
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return {
      match: async (request: { url: string }) => store.get(request.url),
      put: async (request: { url: string }, value: FakeResponse) => { store.set(request.url, value); },
      keys: async () => [...store.keys()].map((url) => ({ url })),
      delete: async (request: { url: string }) => store.delete(request.url),
    };
  };
  const caches = { open, keys: async () => [...stores.keys()], delete: async (name: string) => stores.delete(name) };
  const fetchMock = vi.fn(async (request: { url: string }) => network(request.url));
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, listener: (event: unknown) => void) => { listeners[type] = listener; },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => undefined) },
  };
  new Function('self', 'caches', 'fetch', read('public/sw.js').toString())(self, caches, fetchMock);

  const dispatchFetch = async (url: string, init: { method?: string; mode?: string } = {}) => {
    const respondWith = vi.fn();
    listeners.fetch({ request: { url, method: init.method ?? 'GET', mode: init.mode ?? 'no-cors' }, respondWith });
    const handled = respondWith.mock.calls[0]?.[0] as Promise<FakeResponse> | undefined;
    return { handled: Boolean(handled), result: handled ? await handled : undefined };
  };
  return { listeners, stores, fetchMock, self, dispatchFetch };
}

describe('service worker', () => {
  it.each([
    `${ORIGIN}/api/pacientes`,
    `${ORIGIN}/api/pacientes/10`,
    `${ORIGIN}/api/session/restaurar`,
    'https://hemodinks-api-prod.politepond-d8524c51.brazilsouth.azurecontainerapps.io/api/pacientes',
    'https://bam.nr-data.net/1/abc',
    `${ORIGIN}/`,
    `${ORIGIN}/index.html`,
    `${ORIGIN}/index.html?app-version-check=1`,
    `${ORIGIN}/pacientes/10`,
    `${ORIGIN}/tutorials/login.mp4`,
    `${ORIGIN}/sw.js`,
    `${ORIGIN}/manifest.webmanifest`,
    `${ORIGIN}/assets/index-abc.js?token=x`,
    `${ORIGIN}/assets/nested/file.js`,
    `${ORIGIN}/icons/icon-192.png`,
  ])('não intercepta nem guarda %s', async (url) => {
    const worker = loadServiceWorker();
    const { handled } = await worker.dispatchFetch(url);
    expect(handled).toBe(false);
    expect(worker.fetchMock).not.toHaveBeenCalled();
    expect(worker.stores.size).toBe(0);
  });

  it.each(['POST', 'PUT', 'DELETE'])('não intercepta %s nem em assets', async (method) => {
    const worker = loadServiceWorker();
    expect((await worker.dispatchFetch(`${ORIGIN}/assets/index-abc.js`, { method })).handled).toBe(false);
  });

  it('não intercepta navegação', async () => {
    const worker = loadServiceWorker();
    expect((await worker.dispatchFetch(`${ORIGIN}/assets/index-abc.js`, { mode: 'navigate' })).handled).toBe(false);
  });

  it.each([
    [`${ORIGIN}/assets/index-abc123.js`, 'text/javascript; charset=utf-8'],
    [`${ORIGIN}/assets/index-abc123.css`, 'text/css'],
    [`${ORIGIN}/assets/logo-abc123.jpg`, 'image/jpeg'],
    [`${ORIGIN}/assets/comfortaa-abc123.woff2`, 'font/woff2'],
  ])(
    'guarda o asset estático %s e serve do cache na segunda vez',
    async (url, contentType) => {
      const worker = loadServiceWorker(() => response(undefined, true, contentType));
      expect((await worker.dispatchFetch(url)).handled).toBe(true);
      expect((await worker.dispatchFetch(url)).handled).toBe(true);
      expect(worker.fetchMock).toHaveBeenCalledTimes(1);
      expect([...worker.stores.values()][0].has(url)).toBe(true);
    },
  );

  it.each([['no-store'], ['private, max-age=0']])('não guarda resposta marcada %s', async (cacheControl) => {
    const worker = loadServiceWorker(() => response(cacheControl));
    await worker.dispatchFetch(`${ORIGIN}/assets/index-abc.js`);
    await worker.dispatchFetch(`${ORIGIN}/assets/index-abc.js`);
    expect(worker.fetchMock).toHaveBeenCalledTimes(2);
    expect([...worker.stores.values()].every((store) => store.size === 0)).toBe(true);
  });

  it.each(['text/html; charset=utf-8', 'application/json', 'image/svg+xml', ''])(
    'não guarda asset respondido como %s (ex.: fallback do SPA para um asset que sumiu após deploy)',
    async (contentType) => {
      const worker = loadServiceWorker(() => response(undefined, true, contentType));
      await worker.dispatchFetch(`${ORIGIN}/assets/index-old.js`);
      await worker.dispatchFetch(`${ORIGIN}/assets/index-old.js`);
      expect(worker.fetchMock).toHaveBeenCalledTimes(2);
      expect([...worker.stores.values()].every((store) => store.size === 0)).toBe(true);
    },
  );

  it('não guarda resposta de erro', async () => {
    const worker = loadServiceWorker(() => response(null, false));
    await worker.dispatchFetch(`${ORIGIN}/assets/missing.js`);
    expect([...worker.stores.values()].every((store) => store.size === 0)).toBe(true);
  });

  it('remove apenas caches antigos do próprio app ao ativar', async () => {
    const worker = loadServiceWorker();
    worker.stores.set('hemodinks-static-v0', new Map());
    worker.stores.set('outro-app', new Map());
    let done: Promise<unknown> = Promise.resolve();
    worker.listeners.activate({ waitUntil: (promise: Promise<unknown>) => { done = promise; } });
    await done;
    expect([...worker.stores.keys()]).toEqual(['outro-app']);
    expect(worker.self.clients.claim).toHaveBeenCalled();
  });
});

describe('manifest e ícones', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest').toString());
  const pngSize = (path: string) => {
    const png = read(`public${path}`);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
  };

  it('tem os campos de instalação', () => {
    expect(manifest).toMatchObject({ start_url: '/', scope: '/', display: 'standalone', lang: 'pt-BR', short_name: 'HemoDinks' });
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable')).toBe(true);
  });

  it('referencia ícones que existem com a dimensão declarada', () => {
    for (const icon of manifest.icons) expect(pngSize(icon.src)).toBe(icon.sizes);
    expect(pngSize('/icons/apple-touch-icon.png')).toBe('180x180');
  });

  it('é anunciado no index.html com os metadados de iOS', () => {
    const html = read('index.html').toString();
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />');
    expect(html).toContain('<meta name="theme-color"');
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
  });
});

describe('registerServiceWorker', () => {
  const host = (readyState: DocumentReadyState, register = vi.fn(async () => ({}))) => ({
    navigator: { serviceWorker: { register } as unknown as ServiceWorkerContainer },
    document: { readyState },
    addEventListener: vi.fn(),
  });

  it('registra o worker com escopo raiz quando a página já carregou', () => {
    const target = host('complete');
    registerServiceWorker(true, target);
    expect(target.navigator.serviceWorker.register).toHaveBeenCalledWith(SERVICE_WORKER_URL, { scope: '/' });
  });

  it('espera o load quando a página ainda carrega', () => {
    const target = host('loading');
    registerServiceWorker(true, target);
    expect(target.navigator.serviceWorker.register).not.toHaveBeenCalled();
    const [event, listener] = target.addEventListener.mock.calls[0];
    expect(event).toBe('load');
    listener();
    expect(target.navigator.serviceWorker.register).toHaveBeenCalledTimes(1);
  });

  it('não registra fora do build de produção', () => {
    const target = host('complete');
    registerServiceWorker(false, target);
    expect(target.navigator.serviceWorker.register).not.toHaveBeenCalled();
  });

  it('não falha em navegador sem service worker nem quando o registro é recusado', async () => {
    expect(() => registerServiceWorker(true, { navigator: {}, document: { readyState: 'complete' }, addEventListener: vi.fn() }))
      .not.toThrow();
    const rejected = vi.fn(async () => { throw new Error('insecure context'); });
    expect(() => registerServiceWorker(true, host('complete', rejected))).not.toThrow();
    await Promise.resolve();
  });
});
