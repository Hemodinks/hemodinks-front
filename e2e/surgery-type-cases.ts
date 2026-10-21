import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

type Patient = Record<string, unknown> & { id: number; nomePaciente: string; tipoCirurgia: string; clinicaId: number };
type Helpers = {
  mockApi: (page: Page) => Promise<{ token: string; pacientes: Record<string, unknown>[] }>;
  loginViaUi: (page: Page, path?: string) => Promise<void>;
};
const elective = 'Cirurgia Eletiva Alfa';
const urgent = 'Cirurgia Urgente Alfa';
const beta = 'Cirurgia Urgente Beta';

async function fixture(page: Page, helpers: Helpers) {
  const base = await helpers.mockApi(page);
  const now = new Date().toISOString();
  const records: Patient[] = [
    { ...base.pacientes[0], id: 1731, nomePaciente: elective, tipoCirurgia: 'Eletiva', clinicaId: 1 },
    { ...base.pacientes[0], id: 1732, nomePaciente: urgent, tipoCirurgia: 'Urgencia', clinicaId: 1 },
    { ...base.pacientes[0], id: 1733, nomePaciente: beta, tipoCirurgia: 'Urgencia', clinicaId: 2 },
  ].map(record => ({ ...record, data: now, dataAtendimento: now, dataCadastro: now,
    medicoUserId: 1, medico: 'Ana Hemodinks', pagamento: '150,00', repasseGlosa: '0', statusPago: true }));
  const writes: Record<string, unknown>[] = [];
  const queries: { path: string; clinic: number; params: URLSearchParams }[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const expectedRestore = message.location().url.includes('/api/session/restaurar') && message.text().includes('401');
    if (!expectedRestore) errors.push(message.text());
  });
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (!/^\/api\/(pacientes|faturamentos-medicos)\/(?:\d+)?$/.test(url.pathname)) return route.fallback();
    const slug = request.headers()['x-clinica-slug'];
    expect(['clinica-hemodinks', 'beta']).toContain(slug);
    const clinic = slug === 'beta' ? 2 : 1;
    // The shared fixture has a numeric JWT clinic claim; the app still sends its
    // authoritative selected slug. Real API authorization remains server-owned.
    if (request.headers()['x-clinica-id']) expect(Number(request.headers()['x-clinica-id'])).toBe(clinic);
    expect(request.headers().authorization).toMatch(/^Bearer /);
    const id = Number(url.pathname.match(/\/(\d+)$/)?.[1]);
    if (request.method() === 'POST' || request.method() === 'PUT') {
      const payload = request.postDataJSON() as Record<string, unknown>;
      expect(payload).not.toHaveProperty('clinicaId');
      writes.push(payload);
      const existing = records.find(record => record.id === id && record.clinicaId === clinic);
      if (id && !existing) return route.fulfill({ status: 404, json: {} });
      const record = { ...base.pacientes[0], ...existing, ...payload,
        id: id || 1800 + writes.length, clinicaId: clinic,
        tipoCirurgia: payload.tipoCirurgia ?? existing?.tipoCirurgia ?? 'Eletiva' } as Patient;
      if (existing) records.splice(records.indexOf(existing), 1, record);
      else records.push(record);
      return route.fulfill({ status: id ? 200 : 201, json: record });
    }
    if (id) {
      const record = records.find(record => record.id === id && record.clinicaId === clinic);
      return route.fulfill(record ? { json: record } : { status: 404, json: {} });
    }
    queries.push({ path: url.pathname, clinic, params: url.searchParams });
    const type = url.searchParams.get('tipoCirurgia');
    const search = url.searchParams.get('search')?.toLocaleLowerCase('pt-BR');
    const filtered = records.filter(record => record.clinicaId === clinic && (!type || record.tipoCirurgia === type)
      && (!search || record.nomePaciente.toLocaleLowerCase('pt-BR').includes(search)));
    const pageNumber = Number(url.searchParams.get('page') || 1);
    const pageSize = Number(url.searchParams.get('pageSize') || 100);
    return route.fulfill({ json: { items: filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
      page: pageNumber, pageSize, totalItems: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)) } });
  });
  return { records, writes, queries, errors };
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

async function download(page: Page, label: string, extension: 'pdf' | 'xlsx') {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: label, exact: true }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toMatch(new RegExp(`\\.${extension}$`));
  expect(await file.failure()).toBeNull();
  const bytes = await readFile((await file.path())!);
  expect(bytes.length).toBeGreaterThan(100);
  expect(bytes.subarray(0, extension === 'pdf' ? 4 : 2).toString()).toBe(extension === 'pdf' ? '%PDF' : 'PK');
  if (extension === 'xlsx') return bytes.toString('utf8');
  return [...bytes.toString('latin1').matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)]
    .map(match => match[1].replace(/\\([()\\])/g, '$1')).join(' ');
}

async function openFilters(page: Page) {
  const details = page.locator('details.billing-filters-accordion');
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
  await expect(page.getByRole('combobox', { name: 'Tipo de cirurgia', exact: true })).toBeVisible();
}

export function registerSurgeryTypeCases(helpers: Helpers) {
  test('issue173: cadastro inicia eletiva e urgência persiste na edição e ficha exportada', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const api = await fixture(page, helpers);
    await helpers.loginViaUi(page, '/pacientes');
    await page.getByRole('button', { name: 'Novo paciente', exact: true }).click();
    const group = page.getByRole('group', { name: 'Tipo de cirurgia', exact: true });
    await expect(group.getByRole('radio', { name: 'Eletiva', exact: true })).toBeChecked();
    await group.getByRole('radio', { name: 'Urgência', exact: true }).check();
    await page.getByLabel('Paciente', { exact: true }).fill('Cirurgia Nova Urgente');
    await page.getByRole('combobox', { name: 'Hospital', exact: true }).fill('Hospital Cirurgia');
    await page.getByRole('combobox', { name: 'Hospital', exact: true }).press('Tab');
    const surgeon = page.getByRole('combobox', { name: 'Cirurgião', exact: true });
    await surgeon.fill('Ana');
    await page.getByRole('option', { name: 'Ana Hemodinks', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar procedimento', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Adicionar', exact: true }).click();
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('surgery-type-form.png'), fullPage: true });
    await page.getByRole('button', { name: 'Cadastrar paciente', exact: true }).click();
    await expect(page.getByText('Paciente cadastrado com sucesso.', { exact: true })).toBeVisible();
    expect(api.writes[0]).toMatchObject({ tipoCirurgia: 'Urgencia' });
    await page.getByRole('button', { name: 'Editar Cirurgia Nova Urgente', exact: true }).click();
    await expect(group.getByRole('radio', { name: 'Urgência', exact: true })).toBeChecked();
    for (const [label, extension] of [['Exportar ficha Excel', 'xlsx'], ['Exportar ficha PDF', 'pdf']] as const) {
      expect(await download(page, label, extension)).toContain('Urgência');
    }
    await group.getByRole('radio', { name: 'Eletiva', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(group.getByRole('radio', { name: 'Eletiva', exact: true })).toBeChecked();
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(page.getByText('Paciente atualizado.', { exact: true })).toBeVisible();
    expect(api.writes[1]).toMatchObject({ tipoCirurgia: 'Eletiva' });
    await page.getByRole('button', { name: 'Editar Cirurgia Nova Urgente', exact: true }).click();
    await expect(group.getByRole('radio', { name: 'Eletiva', exact: true })).toBeChecked();
    expect(api.errors).toEqual([]);
  });

  test('issue173: filtro pacientes consulta enum e exporta somente o conjunto escolhido', async ({ page }) => {
    test.setTimeout(90_000);
    const api = await fixture(page, helpers);
    await helpers.loginViaUi(page, '/pacientes');
    await expect(page.getByRole('button', { name: `Editar ${elective}`, exact: true })).toBeVisible();
    await openFilters(page);
    await page.getByRole('combobox', { name: 'Tipo de cirurgia', exact: true }).selectOption('Urgencia');
    await expect(page.getByRole('button', { name: `Editar ${urgent}`, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: `Editar ${elective}`, exact: true })).toHaveCount(0);
    await expect.poll(() => api.queries.some(query => query.path === '/api/pacientes/' && query.params.get('tipoCirurgia') === 'Urgencia')).toBe(true);
    for (const [label, extension] of [['Exportar Planilha', 'xlsx'], ['Exportar PDF', 'pdf']] as const) {
      const text = await download(page, label, extension);
      expect(text).toContain(urgent);
      expect(text).toContain('Urgência');
      expect(text).not.toContain(elective);
      expect(text).not.toContain(beta);
    }
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Tipo de cirurgia', exact: true })).toHaveValue('');
    await expect(page.getByRole('button', { name: `Editar ${elective}`, exact: true })).toBeVisible();
    // Clearing can reuse the unfiltered query cache. Refresh verifies the next
    // actual HTTP request omits the filter rather than asserting cache timing.
    const refreshed = page.waitForRequest(request => new URL(request.url()).pathname === '/api/pacientes/');
    await page.getByRole('button', { name: 'Atualizar lista de pacientes', exact: true }).click();
    expect(new URL((await refreshed).url()).searchParams.has('tipoCirurgia')).toBe(false);
    await noOverflow(page);
    expect(api.errors).toEqual([]);
  });

  for (const path of ['/faturamento-medico', '/relatorios']) test(`issue173: ${path} aplica filtro na API e limpa Todos`, async ({ page }, testInfo) => {
    const api = await fixture(page, helpers);
    await helpers.loginViaUi(page, path);
    await expect(page.getByRole('button', { name: new RegExp(`Itens pendentes do checklist de ${elective}:`) })).toBeVisible();
    await openFilters(page);
    const filter = page.getByRole('combobox', { name: 'Tipo de cirurgia', exact: true });
    await filter.selectOption('Urgencia');
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();
    await expect(page.getByRole('button', { name: new RegExp(`Itens pendentes do checklist de ${urgent}:`) })).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(`Itens pendentes do checklist de ${elective}:`) })).toHaveCount(0);
    await expect.poll(() => api.queries.some(query => query.path === '/api/faturamentos-medicos/' && query.params.get('tipoCirurgia') === 'Urgencia')).toBe(true);
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath('surgery-type-filter.png'), fullPage: true });
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
    await expect(filter).toHaveValue('');
    await expect(page.getByRole('button', { name: new RegExp(`Itens pendentes do checklist de ${elective}:`) })).toBeVisible();
    const refreshed = page.waitForRequest(request => new URL(request.url()).pathname === '/api/faturamentos-medicos/');
    await page.getByRole('button', { name: path === '/relatorios' ? 'Atualizar dados dos relatórios' : 'Atualizar faturamento médico', exact: true }).click();
    expect(new URL((await refreshed).url()).searchParams.has('tipoCirurgia')).toBe(false);
    expect(api.errors).toEqual([]);
  });

  test('issue173: relatórios PDF/XLSX completo e sintético preservam tipo e resumo do filtro', async ({ page }) => {
    test.setTimeout(120_000);
    const api = await fixture(page, helpers);
    await helpers.loginViaUi(page, '/relatorios');
    await openFilters(page);
    await page.getByRole('combobox', { name: 'Tipo de cirurgia', exact: true }).selectOption('Urgencia');
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();
    await expect(page.getByText('1 atendimento(s) encontrados', { exact: true })).toBeVisible();
    for (const level of ['complete', 'synthetic']) {
      await page.getByRole('combobox', { name: 'Formato do relatório', exact: true }).selectOption(level);
      for (const [label, extension] of [['Exportar Planilha', 'xlsx'], ['Exportar PDF', 'pdf']] as const) {
        const text = await download(page, label, extension);
        expect(text).toContain(urgent);
        expect(text).toContain('Urgência');
        expect(text).not.toContain(elective);
        expect(text).not.toContain(beta);
        if (extension === 'xlsx') expect(text).toContain('name="Resumo por tipo de cirurgia"');
        expect(text.includes('Detalhamento de pendências')).toBe(level === 'complete');
      }
    }
    expect(api.errors).toEqual([]);
  });

  test('issue173: restauração em outra clínica descarta resultados e exportação anteriores', async ({ page }) => {
    test.setTimeout(90_000);
    const api = await fixture(page, helpers);
    const authenticated = page.waitForResponse(response => new URL(response.url()).pathname === '/api/users/authenticate');
    await helpers.loginViaUi(page, '/relatorios');
    const current = await (await authenticated).json();
    await openFilters(page);
    await page.getByRole('combobox', { name: 'Tipo de cirurgia', exact: true }).selectOption('Urgencia');
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();
    await expect(page.getByRole('button', { name: new RegExp(`Itens pendentes do checklist de ${urgent}:`) })).toBeVisible();
    const claims = JSON.parse(Buffer.from(current.token.split('.')[1], 'base64url').toString());
    const token = `test.${Buffer.from(JSON.stringify({ ...claims, clinicaId: 2, clinicaSlug: 'beta' })).toString('base64url')}.signature`;
    await page.route('**/api/session/restaurar', route => route.fulfill({ json: { ...current, clinicaId: 2, clinicaSlug: 'beta', token } }));
    await page.reload();
    await expect(page.getByRole('button', { name: new RegExp(`Itens pendentes do checklist de ${beta}:`) })).toBeVisible();
    await expect(page.getByText(urgent, { exact: true })).toHaveCount(0);
    await expect(page.getByText(elective, { exact: true })).toHaveCount(0);
    await openFilters(page);
    const text = await download(page, 'Exportar Planilha', 'xlsx');
    expect(text).toContain(beta);
    expect(text).not.toContain(urgent);
    expect(text).not.toContain(elective);
    expect(api.queries.some(query => query.clinic === 2)).toBe(true);
    expect(api.errors).toEqual([]);
  });
}
