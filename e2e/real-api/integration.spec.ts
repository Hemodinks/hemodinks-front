import { readFile } from 'node:fs/promises';
import { expect, test, type Page, type APIRequestContext } from '@playwright/test';

type Clinic = { id: number; slug: string; nome: string; patientId: number; patientName: string; teamId: number; teamName: string; eventId: number; eventName: string };
type Fixture = { apiUrl: string; password: string; multiEmail: string; singleAEmail: string; singleBEmail: string; a: Clinic; b: Clinic };
let f: Fixture;
const runtime = new WeakMap<Page, { api5xx: number; pageErrors: number; sessionBusy: number; pending: Promise<void>[] }>();
test.beforeAll(async () => { f = JSON.parse(await readFile(process.env.HEMODINKS_REAL_FIXTURE!, 'utf8')); });
test.beforeEach(async ({ page }) => {
  const evidence = { api5xx: 0, pageErrors: 0, sessionBusy: 0, pending: [] as Promise<void>[] };
  runtime.set(page, evidence);
  page.on('pageerror', () => { evidence.pageErrors++; });
  page.on('response', response => {
    if (response.url().startsWith(`${f.apiUrl}/api/`) && response.status() >= 500) {
      evidence.api5xx++;
      evidence.pending.push(response.json().then(body => {
        if (body?.code === 'session_validation_busy') evidence.sessionBusy++;
      }).catch(() => {}));
    }
  });
  await page.addInitScript(() => localStorage.setItem('hemodinks.privacy-consent', JSON.stringify({
    necessary: true, version: '1.1', updatedAt: new Date().toISOString(), preferences: true, analytics: false,
  })));
});
test.afterEach(async ({ page }, info) => {
  const evidence = runtime.get(page)!;
  await Promise.all(evidence.pending);
  info.annotations.push({ type: 'api-5xx-count', description: String(evidence.api5xx) },
    { type: 'page-error-count', description: String(evidence.pageErrors) },
    { type: 'session-busy-count', description: String(evidence.sessionBusy) });
  expect({ api5xx: evidence.api5xx, pageErrors: evidence.pageErrors },
    'Real API must not hide server failures or browser runtime errors').toEqual({ api5xx: 0, pageErrors: 0 });
});

async function apiLogin(request: APIRequestContext, clinic: Clinic, email = f.singleAEmail) {
  const response = await request.post(`${f.apiUrl}/api/users/authenticate`, {
    headers: { 'X-Clinica-Slug': clinic.slug }, data: { email, senha: f.password },
  });
  expect(response.status()).toBe(200);
  return (await response.json()).token as string;
}
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
async function login(page: Page, multi = false) {
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(multi ? f.multiEmail : f.singleAEmail);
  await page.getByLabel('Senha', { exact: true }).fill(f.password);
  const authenticated = page.waitForResponse(r => r.url().endsWith('/api/users/authenticate') && r.ok());
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  if (multi) await page.getByRole('button', { name: f.a.nome, exact: true }).click();
  const session = await (await authenticated).json();
  await finishConsent(page);
  return session.token as string;
}
async function finishConsent(page: Page) {
  // Consent is per synthetic identity and may already exist from another test.
  const terms = page.getByRole('checkbox', { name: /Li e estou ciente/ }).and(page.locator(':enabled'));
  await expect(page.locator('.topbar').or(terms)).toBeVisible();
  if (await terms.isVisible()) {
    await terms.check();
    await page.getByRole('button', { name: 'Aceitar e continuar' }).click();
  }
  await expect(page.locator('.topbar')).toBeVisible();
}
async function navigate(page: Page, label: string) {
  const menu = page.getByLabel('Menu da clínica');
  if (!await menu.isVisible()) await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  if (label === 'Relatórios') {
    const toggle = menu.getByRole('button', { name: /^Faturamento(?: \d+)?$/ });
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  }
  await menu.getByRole('button', { name: label === 'Pacientes' ? /^Pacientes - Cirurgias(?: \d+)?$/ : label, exact: true }).click();
}

test('login: credencial inválida e acesso sem token são negados pela API real', async ({ page, request }) => {
  expect((await request.get(`${f.apiUrl}/api/pacientes/`, { headers: { 'X-Clinica-Slug': f.a.slug } })).status()).toBe(401);
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill('invalid@example.invalid');
  await page.getByLabel('Senha', { exact: true }).fill('Invalid@2026');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.topbar')).toHaveCount(0);
});

test('sessão: cookie HttpOnly, restauração e logout revogam token e refresh', async ({ page, request }) => {
  const token = await login(page);
  const overlapping = await Promise.all(Array.from({ length: 12 }, () => request.get(
    `${f.apiUrl}/api/pacientes/${f.a.patientId}`, { headers: auth(token) },
  )));
  expect(overlapping.map(response => response.status()), 'Concurrent activity must preserve a valid session').toEqual(Array(12).fill(200));
  const cookies = await page.context().cookies();
  expect(cookies.find(c => c.name === 'hemodinks_refresh')).toMatchObject({ httpOnly: true, path: '/api/session' });
  expect(await page.evaluate(() => document.cookie)).not.toContain('hemodinks_refresh');
  expect(await page.evaluate(() => [localStorage.getItem('hemodinks.session'), sessionStorage.getItem('hemodinks.session')])).toEqual([null, null]);
  await page.reload();
  await expect(page.locator('.topbar')).toBeVisible();
  const currentRefresh = (await page.context().cookies()).find(c => c.name === 'hemodinks_refresh')!.value;
  await page.getByRole('button', { name: 'Menu do usuário', exact: true }).click();
  const ended = page.waitForResponse(r => r.url().endsWith('/api/session/sair'));
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  expect((await ended).status()).toBe(204);
  expect((await request.get(`${f.apiUrl}/api/pacientes/`, { headers: auth(token) })).status()).toBe(401);
  const replay = await request.post(`${f.apiUrl}/api/session/restaurar`, {
    headers: { Cookie: `hemodinks_refresh=${currentRefresh}`, Origin: 'http://127.0.0.1:5194', 'X-Session-Refresh': '1' },
  });
  expect(replay.status()).toBe(401);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
});

test('pacientes: UI e detalhe HTTP exibem somente a clínica autorizada', async ({ page, request }) => {
  const token = await login(page);
  await navigate(page, 'Pacientes');
  await expect(page.getByText(f.a.patientName, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(f.b.patientName, { exact: true })).toHaveCount(0);
  const response = await request.get(`${f.apiUrl}/api/pacientes/${f.a.patientId}`, { headers: auth(token) });
  expect(response.status()).toBe(200);
  expect((await response.json()).nomePaciente).toBe(f.a.patientName);
});

test('multi-clínica: troca A → B → A invalida token anterior e limpa pacientes da UI', async ({ page, request }) => {
  let previous = await login(page, true);
  for (const clinic of [f.b, f.a]) {
    await navigate(page, 'Clínicas');
    const switched = page.waitForResponse(r => r.url().endsWith('/api/session/selecionar-clinica') && r.ok());
    await page.getByRole('button', { name: `Acessar ${clinic.nome}`, exact: true }).click();
    const current = await (await switched).json();
    expect((await request.get(`${f.apiUrl}/api/pacientes/`, { headers: auth(previous) })).status()).toBe(401);
    previous = current.token;
    await finishConsent(page);
    await navigate(page, 'Pacientes');
    await expect(page.getByText(clinic.patientName, { exact: true }).first()).toBeVisible();
    await expect(page.getByText((clinic.id === f.a.id ? f.b : f.a).patientName, { exact: true })).toHaveCount(0);
  }
});

test('IDOR: usuário restrito não seleciona B nem lê/altera/exclui identificadores de B', async ({ request }) => {
  const token = await apiLogin(request, f.a);
  const headers = { ...auth(token), 'X-Clinica-Id': String(f.b.id), 'X-Clinica-Slug': f.b.slug };
  expect((await request.post(`${f.apiUrl}/api/session/selecionar-clinica`, { headers, data: { clinicaId: f.b.id } })).status()).toBe(403);
  for (const path of [`/api/pacientes/${f.b.patientId}`, `/api/events/${f.b.eventId}`]) {
    for (const method of ['GET', 'DELETE']) {
      const denied = await request.fetch(`${f.apiUrl}${path}`, { method, headers });
      expect([403, 404]).toContain(denied.status());
      expect(await denied.text()).not.toContain(f.b.patientName);
    }
  }
  const teamDenied = await request.put(`${f.apiUrl}/api/equipes/${f.b.teamId}`, {
    headers, data: { nome: 'CROSS-TENANT-MUTATION', ativo: true, modoIdentificacao: 'Nenhuma' },
  });
  expect([403, 404]).toContain(teamDenied.status());
  const patientDenied = await request.put(`${f.apiUrl}/api/pacientes/${f.b.patientId}`, {
    headers, data: { nomePaciente: 'Cross Tenant Mutation', clinicaId: f.b.id },
  });
  expect([403, 404]).toContain(patientDenied.status());
  const eventDenied = await request.put(`${f.apiUrl}/api/events/${f.b.eventId}`, {
    headers, data: { title: 'Cross Tenant Mutation', start: new Date().toISOString(), end: new Date(Date.now() + 3600000).toISOString() },
  });
  expect([403, 404]).toContain(eventDenied.status());
  // Verify B still exists and has not changed, through an independently authorized identity.
  const owner = await apiLogin(request, f.b, f.singleBEmail);
  const patient = await request.get(`${f.apiUrl}/api/pacientes/${f.b.patientId}`, { headers: auth(owner) });
  expect(patient.status()).toBe(200);
  expect((await patient.json()).nomePaciente).toBe(f.b.patientName);
  expect((await request.get(`${f.apiUrl}/api/events/${f.b.eventId}`, { headers: auth(owner) })).status()).toBe(200);
  const teams = await request.get(`${f.apiUrl}/api/equipes/`, { headers: auth(owner) });
  expect(teams.status()).toBe(200);
  expect(await teams.text()).toContain(f.b.teamName);
  const memberships = await request.get(`${f.apiUrl}/api/session/clinicas`, { headers: auth(token) });
  expect(memberships.status()).toBe(200);
  expect(await memberships.text()).not.toContain(f.b.slug);
});

test('faturamento: API real e relatório preservam escopo A', async ({ page, request }) => {
  const token = await login(page);
  const response = await request.get(`${f.apiUrl}/api/faturamentos-medicos/`, { headers: auth(token) });
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain(f.a.patientName);
  expect(await response.text()).not.toContain(f.b.patientName);
  await navigate(page, 'Relatórios');
  await expect(page.getByText(f.a.patientName, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(f.b.patientName, { exact: true })).toHaveCount(0);
});

test('exportações: PDF e XLSX da UI contêm A e excluem B usando dados reais', async ({ page }) => {
  await login(page);
  await navigate(page, 'Relatórios');
  await expect(page.getByText(f.a.patientName, { exact: true }).first()).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Filtros' }).click();
  for (const [label, extension] of [['Exportar Planilha', 'xlsx'], ['Exportar PDF', 'pdf']]) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: label, exact: true }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${extension}$`));
    const bytes = await readFile((await download.path())!);
    const content = bytes.toString(extension === 'pdf' ? 'latin1' : 'utf8');
    // jsPDF wraps table cells into multiple text operators. Compare the extracted text,
    // as in report-checklist-cases, while retaining both positive and cross-clinic assertions.
    const exportedText = extension === 'pdf'
      ? [...content.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)]
        .map(match => match[1].replace(/\\([()\\])/g, '$1')).join(' ')
      : content;
    expect(exportedText.includes(f.a.patientName), 'Export must contain the authorized patient').toBe(true);
    expect(exportedText.includes(f.b.patientName), 'Export must exclude the other clinic patient').toBe(false);
    if (extension === 'pdf') expect(content.startsWith('%PDF-')).toBe(true);
  }
});

test('equipes: UI e API listam somente equipes da clínica selecionada', async ({ page, request }) => {
  const token = await login(page);
  const response = await request.get(`${f.apiUrl}/api/equipes/`, { headers: auth(token) });
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain(f.a.teamName);
  expect(await response.text()).not.toContain(f.b.teamName);
  await navigate(page, 'Clínicas');
  await page.getByRole('button', { name: `Editar ${f.a.nome}`, exact: true }).click();
  await expect(page.getByText(f.a.teamName, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(f.b.teamName, { exact: true })).toHaveCount(0);
});

test('agenda: criação, leitura e exclusão persistem em SQL e a UI mantém escopo', async ({ page, request }) => {
  const token = await login(page);
  const headers = auth(token);
  const start = new Date(Date.now() + 3600_000).toISOString();
  const end = new Date(Date.now() + 7200_000).toISOString();
  const created = await request.post(`${f.apiUrl}/api/events/`, { headers,
    data: { title: 'EVENTO-E2E-CRIADO', start, end, notifyUser: false, notifyMedicalProfile: false } });
  expect(created.status()).toBe(201);
  const event = await created.json();
  expect((await request.get(`${f.apiUrl}/api/events/${event.id}`, { headers })).status()).toBe(200);
  await navigate(page, 'Agenda e notificações');
  await expect(page.getByText('EVENTO-E2E-CRIADO', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(f.b.eventName, { exact: true })).toHaveCount(0);
  expect((await request.delete(`${f.apiUrl}/api/events/${event.id}`, { headers })).status()).toBe(204);
  expect((await request.get(`${f.apiUrl}/api/events/${event.id}`, { headers })).status()).toBe(404);
});
