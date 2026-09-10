import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Team = { id: number; userId: number; operatorId: number; memberUserId: number; email: string; mode: string; clinicId: number; slug: string };
type Fixture = { apiUrl: string; selection: Team; pin: Team; anonymous: Team; other: Team; password: string; pinValue: string;
  otherPatientId: number; otherPatientName: string;
  individual: { email: string; password: string; clinicId: number } };
const fixture = process.env.HEMODINKS_LOGIN_FIXTURE ? JSON.parse(process.env.HEMODINKS_LOGIN_FIXTURE) as Fixture : null;
test.skip(!fixture, 'Run from LoginBrowserTests to provision a fresh API/database per scenario.');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hemodinks.privacy-consent', JSON.stringify({
    necessary: true, version: '1.1', updatedAt: new Date().toISOString(), preferences: true, analytics: false,
  })));
});

async function loginForm(page: Page, team: Team | null = null) {
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Clínica', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(team?.email ?? fixture!.individual.email);
  await page.getByLabel('Senha', { exact: true }).fill(team ? fixture!.password : fixture!.individual.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

async function finishLegalAndReadSession(page: Page) {
  await expect.poll(() => page.evaluate(() => Boolean(sessionStorage.getItem('hemodinks.session')))).toBe(true);
  // Consent remains a pre-existing, independent requirement for a fresh user.
  await page.getByRole('checkbox', { name: /Li e estou ciente/ }).check();
  await page.getByRole('button', { name: 'Aceitar e continuar' }).click();
  await expect(page.locator('.topbar')).toBeVisible();
  return page.evaluate(() => JSON.parse(sessionStorage.getItem('hemodinks.session')!));
}

async function apiLogin(request: APIRequestContext, team: Team) {
  const contextResponse = await request.post(`${fixture!.apiUrl}/api/users/login-context`, {
    data: { email: team.email, senha: fixture!.password },
  });
  expect(contextResponse.ok()).toBe(true);
  const context = await contextResponse.json();
  expect(context.clinicas).toEqual(expect.arrayContaining([
    expect.objectContaining({ clinicaId: team.clinicId, slug: team.slug }),
  ]));

  const response = await request.post(`${fixture!.apiUrl}/api/users/authenticate`, {
    headers: { 'X-Clinica-Slug': team.slug }, data: { email: team.email, senha: fixture!.password },
  });
  expect(response.ok()).toBe(true);
  const result = await response.json();
  expect(JSON.stringify(result)).not.toMatch(/pinHash|tokenHash|"senha"/i);
  return result;
}
async function identify(request: APIRequestContext, team: Team, token: string, operatorId: number, extras = {}) {
  return request.post(`${fixture!.apiUrl}/api/equipe-auth/identificar`, {
    headers: { 'X-Clinica-Slug': team.slug },
    data: { token, operadorId: operatorId, pin: team.mode === 'Pin' ? fixture!.pinValue : null, ...extras },
  });
}

test('case:individual', async ({ page }) => {
  await loginForm(page);
  const session = await finishLegalAndReadSession(page);
  expect(session.user.clinicaId).toBe(fixture!.individual.clinicId);
  expect(session.user.perfilId).toBe(5);
  await page.goto('/pacientes');
  await expect(page.locator('.topbar')).toBeVisible();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('hemodinks.session'))).toBeNull();
});

for (const mode of ['selection', 'pin'] as const) {
  test(`case:${mode}`, async ({ page, request }) => {
    const team = fixture![mode];
    await loginForm(page, team);
    const select = page.getByRole('combobox', { name: 'Membro da Equipe' });
    await expect(select.locator('option')).toHaveCount(2);
    await select.selectOption(String(team.operatorId));
    if (mode === 'pin') {
      await expect(page.getByLabel('PIN individual')).toBeFocused();
      await expect(page.getByLabel('PIN individual')).toHaveAttribute('inputmode', 'numeric');
      await page.getByLabel('PIN individual').fill(fixture!.pinValue);
    } else await expect(page.getByLabel('PIN individual')).toHaveCount(0);
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    const session = await finishLegalAndReadSession(page);
    expect(session.user.perfilId).toBe(6);
    expect(session.user.clinicaId).toBe(team.clinicId);
    expect(session.user.nome).toBe(`Funcionario ${team.mode}`);
    const claims = JSON.parse(Buffer.from(session.token.split('.')[1], 'base64url').toString());
    expect(Number(claims.equipeId)).toBe(team.id);
    expect(Number(claims.equipeOperadorId)).toBe(team.operatorId);
    expect(claims.identificacaoConfiavel).toBe(String(mode === 'pin'));
    const event = await request.post(`${fixture!.apiUrl}/api/events/`, { headers: { Authorization: `Bearer ${session.token}` },
      data: { title: 'Evento da equipe', start: '2030-01-01T12:00:00Z', end: '2030-01-01T13:00:00Z' } });
    expect(event.ok()).toBe(true);
  });
}

test('case:invalid-pin', async ({ page }) => {
  await loginForm(page, fixture!.pin);
  await page.getByRole('combobox', { name: 'Membro da Equipe' }).selectOption(String(fixture!.pin.operatorId));
  await page.getByLabel('PIN individual').fill('000000');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/Credenciais/i);
  await expect(page.getByLabel('PIN individual')).toHaveValue('');
  expect(await page.evaluate(() => sessionStorage.getItem('hemodinks.session'))).toBeNull();
  await page.getByLabel('PIN individual').fill(fixture!.pinValue);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await finishLegalAndReadSession(page);
});

test('case:anonymous', async ({ page }) => {
  await loginForm(page, fixture!.anonymous);
  const session = await finishLegalAndReadSession(page);
  expect(session.user.clinicaId).toBe(fixture!.anonymous.clinicId);
  await expect(page.getByText('Acesso somente leitura', { exact: true })).toBeVisible();
  await expect(page.getByLabel('PIN individual')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Membro da Equipe' })).toHaveCount(0);
});

test('case:anonymous-write', async ({ page, request }) => {
  await loginForm(page, fixture!.anonymous);
  const session = await finishLegalAndReadSession(page);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const response = await request.fetch(`${fixture!.apiUrl}/api/events/${method === 'POST' ? '' : '1'}`, {
      method, headers: { Authorization: `Bearer ${session.token}`, 'X-Clinica-Id': String(fixture!.other.clinicId) },
      data: { clinicaId: fixture!.other.clinicId, equipeId: fixture!.other.id },
    });
    expect(response.status()).toBe(403);
  }
});

test('case:cross-tenant', async ({ request }) => {
  const team = fixture!.pin;
  const login = await apiLogin(request, team);
  expect(login.equipeDesafio.operadores.map((op: { id: number }) => op.id)).toEqual([team.operatorId]);
  expect((await identify(request, fixture!.other, login.equipeDesafio.token, fixture!.other.operatorId)).status()).toBe(401);
  expect((await identify(request, team, login.equipeDesafio.token, fixture!.other.operatorId,
    { clinicaId: fixture!.other.clinicId, equipeId: fixture!.other.id, userId: fixture!.other.memberUserId })).status()).toBe(401);
  const otherLogin = await apiLogin(request, fixture!.other);
  expect((await identify(request, team, otherLogin.equipeDesafio.token, team.operatorId)).status()).toBe(401);
  const response = await identify(request, team, login.equipeDesafio.token, team.operatorId,
    { clinicaId: fixture!.other.clinicId, equipeId: fixture!.other.id, userId: fixture!.other.memberUserId });
  expect(response.ok()).toBe(true);
  const { token } = await response.json();
  expect(Number(JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).clinicaId)).toBe(team.clinicId);
  for (const path of ['/api/pacientes/', '/api/faturamentos-medicos/', '/api/events/']) {
    const resource = await request.get(`${fixture!.apiUrl}${path}`, { headers: {
      Authorization: `Bearer ${token}`, 'X-Clinica-Slug': fixture!.other.slug, 'X-Clinica-Id': String(fixture!.other.clinicId),
    } });
    expect(resource.headers()['x-clinica-slug']).toBe(team.slug);
    expect(resource.ok()).toBe(true);
    expect(await resource.text()).not.toContain(fixture!.otherPatientName);
  }
  const patient = await request.get(`${fixture!.apiUrl}/api/pacientes/${fixture!.otherPatientId}`, { headers: { Authorization: `Bearer ${token}` } });
  expect([403, 404]).toContain(patient.status());
});

test('case:operator-swap', async ({ request }) => {
  const login = await apiLogin(request, fixture!.selection);
  expect((await identify(request, fixture!.selection, login.equipeDesafio.token, fixture!.pin.operatorId)).status()).toBe(401);
});

test('case:replay', async ({ request }) => {
  const login = await apiLogin(request, fixture!.selection);
  expect((await identify(request, fixture!.selection, login.equipeDesafio.token, fixture!.selection.operatorId)).ok()).toBe(true);
  expect((await identify(request, fixture!.selection, login.equipeDesafio.token, fixture!.selection.operatorId)).status()).toBe(401);
});

test('case:cancel', async ({ page }) => {
  await loginForm(page, fixture!.pin);
  await page.getByRole('combobox', { name: 'Membro da Equipe' }).selectOption(String(fixture!.pin.operatorId));
  await page.getByLabel('PIN individual').fill(fixture!.pinValue);
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('PIN individual')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Clínica', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('hemodinks.session'))).toBeNull();
});

test('case:layout', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Clínica', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toBeEnabled();
  await expect.poll(() => page.locator('.brand-mark').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('login-desktop-dark.png'), fullPage: true });
  await page.getByRole('button', { name: 'Tema claro', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('login-mobile-light.png'), fullPage: true });
  const accessibility = await new AxeBuilder({ page }).include('.login-panel').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(accessibility.violations).toEqual([]);
});
