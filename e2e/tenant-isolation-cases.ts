import { expect, test, type Page, type Route } from '@playwright/test';

type Helpers = {
  mockApi: (page: Page) => Promise<unknown>;
  login: (page: Page, path?: string) => Promise<void>;
  user: Record<string, unknown>;
  patient: Record<string, unknown>;
};

const clinics = [
  { id: 1, nome: 'Clínica Alfa', slug: 'alfa' },
  { id: 2, nome: 'Clínica Beta', slug: 'beta' },
];
const marker = (id: number) => `Paciente Exclusivo ${id === 1 ? 'Alfa' : 'Beta'}`;
const expiresAt = Math.floor(Date.now() / 1000) + 3600;
function token(id: number) {
  return `test.${Buffer.from(JSON.stringify({ sid: 'tenant-audit-session', usuarioGlobalId: 100,
    usuarioClinicaId: 100, clinicaId: String(id), clinicaSlug: clinics[id - 1].slug,
    exp: expiresAt })).toString('base64url')}.signature`;
}
function deferred() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}
async function navigate(page: Page, label: string) {
  const menu = page.getByLabel('Menu da clínica');
  const openMenu = page.getByRole('button', { name: 'Abrir menu', exact: true });
  await expect.poll(async () => await menu.isVisible() || await openMenu.isVisible()).toBe(true);
  if (!await menu.isVisible()) await openMenu.click();
  if (label === 'Relatórios' || label === 'Faturamento') {
    const toggle = menu.getByRole('button', { name: /^Faturamento(?: \d+)?$/ });
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  }
  const name = label === 'Pacientes' ? /^Pacientes - Cirurgias(?: \d+)?$/ : label === 'Agenda' ? 'Agenda e notificações'
    : label === 'Faturamento' ? 'Gestão de faturamento' : label;
  await page.getByLabel('Menu da clínica').getByRole('button', { name, exact: true }).click();
}
async function switchClinic(page: Page, id: number) {
  await navigate(page, 'Clínicas');
  const access = page.getByRole('button', { name: `Acessar ${clinics[id - 1].nome}`, exact: true });
  await expect(access).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  if (id === 2 && page.viewportSize()?.width === 390 && test.info().title.includes('Pacientes')) {
    await page.screenshot({ path: test.info().outputPath('clinics-mobile.png'), fullPage: true });
  }
  await access.click();
  await expect(page.getByRole('button', { name: 'Menu do usuário', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export function registerTenantIsolationCases(helpers: Helpers) {
  async function setup(page: Page, server = { active: 1, authenticated: false }, deniedClinics = new Set<number>()) {
    await helpers.mockApi(page);
    const requests: { path: string; id: string | undefined; slug: string | undefined; token: string | undefined }[] = [];
    const record = (id: number) => ({ ...helpers.patient, id: 10, nomePaciente: marker(id),
      data: new Date().toISOString(), dataAtendimento: new Date().toISOString(),
      arquivosCount: 1, arquivos: [{ id: 7, nomeOriginal: `documento-${clinics[id - 1].slug}.pdf`, tamanho: 10 }] });
    await page.route('**/api/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const response = (id: number) => ({ ...helpers.user, clinicaId: id, clinicaSlug: clinics[id - 1].slug, token: token(id) });
      if (path === '/api/session/restaurar') return route.fulfill(server.authenticated
        ? { json: response(server.active) } : { status: 401, json: {} });
      if (path === '/api/session/sair') { server.authenticated = false; return route.fulfill({ status: 204 }); }
      if (path === '/api/users/authenticate') { server.authenticated = true; return route.fulfill({ json: response(server.active) }); }
      if (path === '/api/users/login-context') return route.fulfill({ json: { clinicas: clinics.filter(c => c.id === server.active).map(c => ({ clinicaId: c.id, nome: c.nome, slug: c.slug })) } });
      if (path === '/api/platform/clinicas') return route.fulfill({ json: clinics.map(c => ({ ...c, cnpj: '11222333000181', ativa: true,
        plano: 'Completa', assinaturaStatus: 'Ativa', usuarios: 2, modulosLiberados: ['usuarios', 'pacientes', 'faturamento', 'grupos-medicos', 'agenda'] })) });
      if (path === '/api/session/selecionar-clinica') {
        server.active = request.postDataJSON().clinicaId;
        const clinic = clinics[server.active - 1];
        return route.fulfill({ json: { token: token(server.active), clinica: { clinicaId: clinic.id, slug: clinic.slug,
          nome: clinic.nome, userId: 100, perfilId: 5, perfil: 'SuperAdministrador',
          modulosLiberados: ['usuarios', 'pacientes', 'faturamento', 'grupos-medicos', 'agenda'] } } });
      }
      if (/^\/api\/(pacientes|faturamentos-medicos|events)(\/|$)/.test(path)) {
        const headers = request.headers();
        requests.push({ path, id: headers['x-clinica-id'], slug: headers['x-clinica-slug'], token: headers.authorization });
        const id = Number(headers['x-clinica-id']);
        expect([1, 2]).toContain(id);
        expect(headers['x-clinica-slug']).toBe(clinics[id - 1].slug);
        expect(headers.authorization).toBe(`Bearer ${token(id)}`);
        if (path.startsWith('/api/pacientes') && deniedClinics.has(id)) {
          return route.fulfill({ status: 403, json: { message: 'Paciente de outra clínica: detalhe privado fictício' } });
        }
        if (path === '/api/pacientes/10') return route.fulfill({ json: record(id) });
        if (path === '/api/pacientes/' || path === '/api/faturamentos-medicos/') return route.fulfill({ json: {
          items: [record(id)], page: 1, pageSize: 10, totalItems: 1, totalPages: 1,
        } });
        if (path === '/api/events/') {
          const now = new Date(); now.setHours(12, 0, 0, 0);
          return route.fulfill({ json: [{ id: 30, title: `Evento Exclusivo ${id === 1 ? 'Alfa' : 'Beta'}`,
            description: '', start: now.toISOString(), end: new Date(+now + 3600000).toISOString(),
            isAllDay: false, isCompleted: false, medicalUserId: null }] });
        }
      }
      return route.fallback();
    });
    return { server, requests };
  }

  test('responsive #163: recusa de arquivo cross-tenant não expõe conteúdo nem inicia download', async ({ page }) => {
    await setup(page);
    const downloads: string[] = [];
    page.on('download', file => downloads.push(file.suggestedFilename()));
    // The server refuses this stale file reference in clinic Alfa. It never sends Beta's bytes.
    await page.route('**/api/pacientes/10/arquivos/7/download', async route => {
      expect(route.request().headers()['x-clinica-id']).toBe('1');
      expect(route.request().headers().authorization).toBe(`Bearer ${token(1)}`);
      await route.fulfill({ status: 403, json: { message: 'Operação não permitida.' } });
    });
    await helpers.login(page, '/pacientes');
    await page.getByRole('button', { name: `Arquivos anexos de ${marker(1)}`, exact: true }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toContainText('documento-alfa.pdf');
    await modal.getByRole('button', { name: 'Baixar', exact: true }).click();
    await expect(modal.getByRole('button', { name: 'Tentar novamente', exact: true })).toHaveAttribute('title', 'Operação não permitida.');
    await expect(page.getByText(marker(2), { exact: true })).toHaveCount(0);
    await expect(page.getByText('documento-beta.pdf', { exact: true })).toHaveCount(0);
    expect(downloads).toEqual([]);
  });

  for (const [label, path] of [['Pacientes', '/pacientes'], ['Relatórios', '/relatorios'], ['Faturamento', '/faturamento-medico']]) {
    test(`tenant #162: ${label} não reutiliza dados ao trocar Alfa → Beta → Alfa pela UI`, async ({ page }) => {
      const state = await setup(page);
      await helpers.login(page, path);
      await expect(page.getByText(marker(1), { exact: true })).toBeVisible();
      for (const id of [2, 1]) {
        const before = state.requests.length;
        const requested = deferred(); const release = deferred();
        if (label === 'Pacientes' && id === 2) {
          await page.route('**/api/pacientes/?*', async route => {
            requested.release(); await release.promise; await route.fallback();
          }, { times: 1 });
        }
        const switching = switchClinic(page, id);
        if (label === 'Pacientes' && id === 2) {
          await requested.promise;
          try {
            await expect(page.getByText(marker(1), { exact: true })).toHaveCount(0);
          } finally { release.release(); }
        }
        await switching;
        await navigate(page, label);
        await expect(page.getByText(marker(id), { exact: true })).toBeVisible();
        await expect(page.getByText(marker(id === 1 ? 2 : 1), { exact: true })).toHaveCount(0);
        const operational = state.requests.slice(before).filter(r => /\/(pacientes|faturamentos-medicos)\/$/.test(r.path));
        expect(operational.length).toBeGreaterThan(0);
        expect(operational.every(r => r.id === String(id))).toBe(true);
      }
    });
  }

  test('tenant #163: resposta negada na clínica Beta não recupera dados da Alfa', async ({ page }) => {
    const denied = new Set<number>([2]);
    const state = await setup(page, undefined, denied);
    await helpers.login(page, '/pacientes');
    await expect(page.getByText(marker(1), { exact: true })).toBeVisible();
    await switchClinic(page, 2);
    await navigate(page, 'Pacientes');
    await expect(page.getByRole('alert')).toContainText('Operação não permitida.');
    await expect(page.getByText(marker(1), { exact: true })).toHaveCount(0);
    await expect(page.getByText(marker(2), { exact: true })).toHaveCount(0);
    await expect(page.getByText('Paciente de outra clínica: detalhe privado fictício', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: `Arquivos anexos de ${marker(1)}`, exact: true })).toHaveCount(0);
    // A recovery in the same context must fetch Beta, never restore Alfa's cache.
    const before = state.requests.length;
    denied.clear();
    await page.getByRole('button', { name: 'Atualizar lista de pacientes', exact: true }).click();
    await expect(page.getByText(marker(2), { exact: true })).toBeVisible();
    await expect(page.getByText(marker(1), { exact: true })).toHaveCount(0);
    const refreshed = state.requests.slice(before);
    expect(refreshed.length).toBeGreaterThan(0);
    expect(refreshed.every(request => request.id === '2')).toBe(true);
  });

  test('tenant #162: agenda recarrega eventos ao trocar Alfa → Beta → Alfa pela UI', async ({ page }) => {
    await setup(page);
    await helpers.login(page, '/agenda');
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await expect(page.getByText('Evento Exclusivo Alfa', { exact: true })).toBeVisible();
    for (const id of [2, 1]) {
      await switchClinic(page, id);
      await navigate(page, 'Agenda');
      await page.getByRole('button', { name: 'Lista', exact: true }).click();
      await expect(page.getByText(`Evento Exclusivo ${id === 1 ? 'Alfa' : 'Beta'}`, { exact: true })).toBeVisible();
      await expect(page.getByText(`Evento Exclusivo ${id === 1 ? 'Beta' : 'Alfa'}`, { exact: true })).toHaveCount(0);
    }
  });

  test('tenant #162: logout/login em outra clínica descarta paciente e arquivos da sessão anterior', async ({ page }) => {
    const state = await setup(page);
    await helpers.login(page, '/pacientes');
    await page.getByRole('button', { name: `Arquivos anexos de ${marker(1)}`, exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('documento-alfa.pdf');
    await page.getByRole('button', { name: 'Fechar arquivos do paciente', exact: true }).click();
    await page.getByRole('button', { name: 'Menu do usuário', exact: true }).click();
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Acesso ao sistema' })).toBeVisible();
    state.server.active = 2;
    await page.getByLabel('Email').fill(String(helpers.user.email));
    await page.locator('#login-password').fill(['acesso', 'teste', 'ci'].join('-'));
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await navigate(page, 'Pacientes');
    await expect(page.getByRole('cell', { name: marker(2), exact: true })).toBeVisible();
    await expect(page.getByText(marker(1), { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: `Arquivos anexos de ${marker(2)}`, exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('documento-beta.pdf');
    await expect(page.getByText('documento-alfa.pdf', { exact: true })).toHaveCount(0);
  });

  test('tenant #162: troca em uma aba invalida a outra e bloqueia resposta tardia de pacientes', async ({ page, context }) => {
    const state = await setup(page);
    await helpers.login(page, '/pacientes');
    await expect(page.getByRole('cell', { name: marker(1), exact: true })).toBeVisible();
    const other = await context.newPage();
    await setup(other, state.server);
    await other.goto('/pacientes');
    await expect(other.getByRole('cell', { name: marker(1), exact: true })).toBeVisible();
    const requested = deferred(); const response = deferred(); const settled = deferred();
    await other.route('**/api/pacientes/?*', async (route: Route) => {
      requested.release(); await response.promise;
      await route.fulfill({ json: { items: [{ ...helpers.patient, nomePaciente: 'Paciente Alfa Tardio' }],
        page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } }).catch(() => {});
      settled.release();
    });
    await other.getByRole('button', { name: 'Atualizar lista de pacientes', exact: true }).click();
    await requested.promise;
    await switchClinic(page, 2);
    await expect(other.getByRole('heading', { name: 'Acesso ao sistema' })).toBeVisible();
    response.release();
    await settled.promise;
    await expect(other.getByText('Paciente Alfa Tardio', { exact: true })).toHaveCount(0);
    await expect(other.getByText(marker(1), { exact: true })).toHaveCount(0);
    await navigate(page, 'Pacientes');
    await expect(page.getByRole('cell', { name: marker(2), exact: true })).toBeVisible();
    await other.close();
  });

  test('tenant #162: logout em uma aba remove dados protegidos da outra aba', async ({ page, context }) => {
    const state = await setup(page);
    await helpers.login(page, '/pacientes');
    await expect(page.getByRole('cell', { name: marker(1), exact: true })).toBeVisible();
    const other = await context.newPage();
    await setup(other, state.server);
    await other.goto('/relatorios');
    await expect(other.getByRole('heading', { name: marker(1), exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Menu do usuário', exact: true }).click();
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(other.getByRole('heading', { name: 'Acesso ao sistema' })).toBeVisible();
    await expect(other.getByText(marker(1), { exact: true })).toHaveCount(0);
    await expect(other.getByRole('button', { name: 'Exportar PDF', exact: true })).toHaveCount(0);
    await other.close();
  });
}
