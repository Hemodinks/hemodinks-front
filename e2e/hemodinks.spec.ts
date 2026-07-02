import { expect, test, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LOGIN_PASSWORD = ['acesso', 'teste', 'ci'].join('-');

const session = {
  token: 'jwt-token',
  user: {
    id: 99,
    nome: 'George Marcone',
    email: 'gmarcone@gmail.com',
    cpf: '00000000191',
    fotoPerfil: null,
    precisaTrocarSenha: false,
    perfilId: 1,
    perfilNome: 'Administrador',
  },
};

const patientSession = {
  token: 'patient-token',
  user: {
    id: 20,
    nome: 'Paciente Hemodinks',
    email: 'paciente@hemodinks.com',
    cpf: '11144477735',
    fotoPerfil: null,
    precisaTrocarSenha: false,
    perfilId: 3,
    perfilNome: 'Pacientes',
  },
};

const paciente = {
  id: 10,
  userId: 20,
  data: '2026-06-01T00:00:00Z',
  nomePaciente: 'Paciente Hemodinks',
  hospitalId: 1,
  hospital: 'Santa Clara - Mater Dei',
  medicoUserId: 1,
  medico: 'Dra. Ana',
  convenioId: 7,
  convenio: 'Particular',
  cbhpmCodigo: '1.01.01.01-2',
  cbhpmPorte: '2B',
  procedimento: 'Consulta',
  procedimentos: [
    {
      cbhpmCodigo: '1.01.01.01-2',
      cbhpmPorte: '2B',
      procedimento: 'Consulta',
      valorReferencia: null,
      ordem: 1,
    },
  ],
  autorizacao: 'AUT-1',
  pagamento: 'Pix',
  repasseGlosa: 'Sem glosa',
  statusPago: true,
  cpf: '11144477735',
  email: 'paciente@hemodinks.com',
  telefone: '+5581998888888',
  fotoPerfil: null,
  dataNascimento: '1992-05-10T00:00:00Z',
  ativo: true,
  arquivosCount: 0,
  arquivos: [],
};

const cbhpmItem = {
  id: 1,
  codigo: '1.01.01.01-2',
  porte: '2B',
  procedimento: 'Consulta',
  valorReferencia: 120,
};

const opmeFornecedor = {
  idFornecedor: 1,
  fornecedor: 'Promedom',
};

const user = {
  id: 1,
  nome: 'Ana Hemodinks',
  email: 'ana@hemodinks.com',
  telefone: '+5581999999999',
  cpf: '52998224725',
  crm: '12345',
  crmUf: 'PE',
  fotoPerfil: null,
  dataCadastro: '2026-06-01T00:00:00Z',
  dataNascimento: '1990-01-01T00:00:00Z',
  ativo: true,
  precisaTrocarSenha: false,
  perfilId: 2,
  perfilNome: 'Medicos',
  arquivosCount: 0,
  arquivos: [],
};

const agendaEvent = {
  id: 30,
  userId: 99,
  medicalUserId: null,
  medicalUserName: null,
  title: 'Evento existente',
  description: 'Criado pelo mock',
  start: '2026-06-11T12:00:00.000Z',
  end: '2026-06-11T13:00:00.000Z',
  notifyMedicalProfile: false,
  notifyUser: true,
  reminderPeriodMinutes: 1440,
  isCompleted: false,
};

function paged<T>(items: T[]) {
  return {
    items,
    page: 1,
    pageSize: 10,
    totalItems: items.length,
    totalPages: 1,
  };
}

type Payload = Record<string, unknown>;

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function buildPacienteFromPayload(id: number, payload: Payload) {
  const procedimentos = Array.isArray(payload.procedimentos)
    ? payload.procedimentos
    : paciente.procedimentos;

  return {
    ...paciente,
    id,
    userId: Number(payload.userId ?? paciente.userId),
    data: typeof payload.data === 'string' ? payload.data : paciente.data,
    nomePaciente: String(payload.nomePaciente ?? paciente.nomePaciente),
    hospitalId: Number(payload.hospitalId ?? paciente.hospitalId),
    hospital: String(payload.hospital ?? paciente.hospital),
    medicoUserId: Number(payload.medicoUserId ?? paciente.medicoUserId),
    medico: String(payload.medico ?? paciente.medico),
    convenioId: Number(payload.convenioId ?? paciente.convenioId),
    convenio: String(payload.convenio ?? paciente.convenio),
    cbhpmCodigo: String(payload.cbhpmCodigo ?? paciente.cbhpmCodigo),
    cbhpmPorte: String(payload.cbhpmPorte ?? paciente.cbhpmPorte),
    procedimento: String(payload.procedimento ?? paciente.procedimento),
    procedimentos,
    autorizacao: String(payload.autorizacao ?? paciente.autorizacao),
    pagamento: String(payload.pagamento ?? paciente.pagamento),
    repasseGlosa: String(payload.repasseGlosa ?? paciente.repasseGlosa),
    statusPago: Boolean(payload.statusPago ?? paciente.statusPago),
    cpf: String(payload.cpf ?? paciente.cpf),
    email: String(payload.email ?? paciente.email),
    telefone: String(payload.telefone ?? paciente.telefone),
    dataNascimento: String(payload.dataNascimento ?? paciente.dataNascimento),
    ativo: Boolean(payload.ativo ?? paciente.ativo),
  };
}

function buildUserFromPayload(id: number, payload: Payload) {
  return {
    ...user,
    id,
    nome: String(payload.nome ?? user.nome),
    email: String(payload.email ?? user.email),
    telefone: String(payload.telefone ?? user.telefone),
    cpf: String(payload.cpf ?? user.cpf),
    crm: String(payload.crm ?? ''),
    crmUf: String(payload.crmUf ?? ''),
    dataNascimento: String(payload.dataNascimento ?? user.dataNascimento),
    ativo: Boolean(payload.ativo ?? true),
    perfilId: Number(payload.perfilId ?? user.perfilId),
    perfilNome: Number(payload.perfilId ?? user.perfilId) === 1 ? 'Administrador' : user.perfilNome,
  };
}

function buildAgendaEventFromPayload(id: number, payload: Payload) {
  return {
    ...agendaEvent,
    id,
    title: String(payload.title ?? agendaEvent.title),
    description: typeof payload.description === 'string' ? payload.description : null,
    start: String(payload.start ?? agendaEvent.start),
    end: String(payload.end ?? agendaEvent.end),
    notifyMedicalProfile: Boolean(payload.notifyMedicalProfile),
    notifyUser: Boolean(payload.notifyUser),
    reminderPeriodMinutes: Number(payload.reminderPeriodMinutes ?? agendaEvent.reminderPeriodMinutes),
  };
}

async function loginViaUi(page: Page, initialRoute = '/', loginSession = session) {
  await page.goto(initialRoute);
  await page.getByLabel('Email').fill(loginSession.user.email);
  await page.locator('#login-password').fill(LOGIN_PASSWORD);
  await page.getByRole('button', { name: /entrar/i }).click();
}

async function mockApi(page: Page, loginSession = session) {
  const state = {
    users: [user],
    pacientes: [paciente],
    events: [agendaEvent],
    loginPayload: null as Payload | null,
    createdUserPayload: null as Payload | null,
    updatedUserPayload: null as Payload | null,
    createdPacientePayload: null as Payload | null,
    updatedPacientePayload: null as Payload | null,
    createdEventPayload: null as Payload | null,
  };

  await page.route('https://date.nager.at/**', (route) => route.fulfill({ json: [] }));
  await page.route('http://localhost:5000/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/users/authenticate' && method === 'POST') {
      state.loginPayload = request.postDataJSON() as Payload;
      return route.fulfill({
        json: {
          id: loginSession.user.id,
          nome: loginSession.user.nome,
          email: loginSession.user.email,
          token: loginSession.token,
          cpf: loginSession.user.cpf,
          fotoPerfil: loginSession.user.fotoPerfil,
          precisaTrocarSenha: false,
          perfilId: loginSession.user.perfilId,
          perfilNome: loginSession.user.perfilNome,
        },
      });
    }

    if (path === '/api/dashboard/summary') {
      return route.fulfill({
        json: {
          usersCount: state.users.length,
          activeUsersCount: state.users.filter((item) => item.ativo).length,
          pacientesCount: state.pacientes.length,
          activePatientsCount: state.pacientes.filter((item) => item.ativo).length,
          pendingPaymentsCount: 0,
          patientFilesCount: 0,
          upcomingEventsCount: state.events.length,
        },
      });
    }

    if (path === '/api/dashboard/notifications') {
      return route.fulfill({ json: [] });
    }

    if (path === '/api/users/') {
      if (method === 'POST') {
        const payload = request.postDataJSON() as Payload;
        const createdUser = buildUserFromPayload(2, payload);
        state.createdUserPayload = payload;
        state.users = [createdUser, ...state.users];

        return route.fulfill({ json: createdUser });
      }

      return route.fulfill({ json: paged(state.users) });
    }

    const userMatch = path.match(/^\/api\/users\/(\d+)$/);
    if (userMatch) {
      const id = Number(userMatch[1]);

      if (method === 'PUT') {
        const payload = request.postDataJSON() as Payload;
        const updatedUser = buildUserFromPayload(id, payload);
        state.updatedUserPayload = payload;
        state.users = state.users.map((item) => (item.id === id ? updatedUser : item));

        return route.fulfill({ json: updatedUser });
      }

      if (method === 'DELETE') {
        state.users = state.users.filter((item) => item.id !== id);
        return route.fulfill({ status: 204, body: '' });
      }

      return route.fulfill({ json: state.users.find((item) => item.id === id) ?? user });
    }

    if (path === '/api/pacientes/') {
      if (method === 'POST') {
        const payload = request.postDataJSON() as Payload;
        const createdPaciente = buildPacienteFromPayload(11, payload);
        state.createdPacientePayload = payload;
        state.pacientes = [createdPaciente, ...state.pacientes];

        return route.fulfill({ json: createdPaciente });
      }

      return route.fulfill({ json: paged(state.pacientes) });
    }

    const pacienteMatch = path.match(/^\/api\/pacientes\/(\d+)$/);
    if (pacienteMatch) {
      const id = Number(pacienteMatch[1]);

      if (method === 'PUT') {
        const payload = request.postDataJSON() as Payload;
        const updatedPaciente = buildPacienteFromPayload(id, payload);
        state.updatedPacientePayload = payload;
        state.pacientes = state.pacientes.map((item) => (item.id === id ? updatedPaciente : item));

        return route.fulfill({ json: updatedPaciente });
      }

      return route.fulfill({ json: state.pacientes.find((item) => item.id === id) ?? paciente });
    }

    if (path === '/api/hospitais/') {
      return route.fulfill({ json: [{ id: 1, nome: 'Santa Clara - Mater Dei' }] });
    }

    if (path === '/api/convenios/') {
      return route.fulfill({ json: [{ idConvenio: 7, descricaoConvenio: 'Particular' }] });
    }

    if (path === '/api/opme/') {
      return route.fulfill({ json: [opmeFornecedor] });
    }

    if (path === '/api/grupos-medicos/medicos') {
      return route.fulfill({ json: [{ id: user.id, nome: user.nome, email: user.email }] });
    }

    if (path === '/api/cbhpm/') {
      return route.fulfill({ json: paged([cbhpmItem]) });
    }

    if (path === '/api/events/medical-users') {
      return route.fulfill({ json: [{ id: user.id, nome: user.nome }] });
    }

    if (path === '/api/events/notification-recipients') {
      return route.fulfill({
        json: {
          canNotifyAllAllowedRecipients: true,
          allRecipientsLabel: 'Todos os destinatarios disponiveis',
          users: [{
            id: user.id,
            nome: user.nome,
            email: user.email,
            perfilId: user.perfilId,
            perfilNome: user.perfilNome,
          }],
          groups: [],
        },
      });
    }

    if (path === '/api/events/') {
      if (method === 'POST') {
        const payload = request.postDataJSON() as Payload;
        const createdEvent = buildAgendaEventFromPayload(31, payload);
        state.createdEventPayload = payload;
        state.events = [createdEvent, ...state.events];

        return route.fulfill({ json: createdEvent });
      }

      return route.fulfill({ json: state.events });
    }

    const eventMatch = path.match(/^\/api\/events\/(\d+)$/);
    if (eventMatch && method === 'PUT') {
      const id = Number(eventMatch[1]);
      const payload = request.postDataJSON() as Payload;
      const updatedEvent = buildAgendaEventFromPayload(id, payload);
      state.events = state.events.map((item) => (item.id === id ? updatedEvent : item));

      return route.fulfill({ json: updatedEvent });
    }

    if (path.match(/^\/api\/events\/(\d+)\/complete$/) && method === 'POST') {
      return route.fulfill({ status: 204, body: '' });
    }

    return route.fulfill({ json: {} });
  });

  return state;
}

async function expectNoGlobalHorizontalOverflow(page: Page) {
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).resolves.toBe(true);
}

async function captureRouteScreenshot(page: Page, testInfo: TestInfo, route: string, width: number) {
  await page.setViewportSize({ width, height: width < 600 ? 860 : 900 });
  await loginViaUi(page, route);
  await page.screenshot({ path: testInfo.outputPath(`${route.replace('/', '') || 'home'}-${width}.png`), fullPage: true });
  await expectNoGlobalHorizontalOverflow(page);
}

async function captureCurrentScreenshot(page: Page, testInfo: TestInfo, name: string, width: number) {
  await page.setViewportSize({ width, height: width < 600 ? 860 : 900 });
  await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: true });
  await expectNoGlobalHorizontalOverflow(page);
}

test('faz login pelo formulario e abre o dashboard', async ({ page }) => {
  const apiState = await mockApi(page);

  await page.goto('/');
  await page.getByLabel('Email').fill('gmarcone@gmail.com');
  await page.locator('#login-password').fill(LOGIN_PASSWORD);
  await page.getByRole('button', { name: /entrar/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Painel inicial' })).toBeVisible();
  expect(apiState.loginPayload).toMatchObject({
    email: 'gmarcone@gmail.com',
    senha: LOGIN_PASSWORD,
  });
});

test('navega pelos fluxos principais autenticados', async ({ page }) => {
  await mockApi(page);
  await loginViaUi(page, '/dashboard');
  await expect(page.getByRole('heading', { name: 'Painel inicial' })).toBeVisible();
  await expect(page.getByRole('button', { name: /abrir pacientes/i })).toBeVisible();

  await page.getByRole('button', { name: /abrir pacientes/i }).click();
  await expect(page).toHaveURL(/\/pacientes$/);
  await expect(page.getByRole('heading', { name: 'Pacientes' })).toBeVisible();
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();

  await page.getByLabel('Sessao ativa').getByRole('button', { name: /agenda/i }).click();
  await expect(page).toHaveURL(/\/agenda$/);
  await expect(page.getByRole('heading', { name: 'Agenda e notificacoes', level: 1 })).toBeVisible();
  const openNewEventButton = page.locator('.agenda-tools').getByRole('button', { name: 'Novo evento' });
  await expect(openNewEventButton).toBeVisible();
  await openNewEventButton.click();
  await expect(page.getByRole('heading', { name: 'Novo evento', level: 2 })).toBeVisible();
});

test('mantem telas criticas sem overflow horizontal no mobile', async ({ page }) => {
  await mockApi(page);

  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 860 });

    await loginViaUi(page, '/agenda');
    await expect(page.getByRole('heading', { name: 'Agenda e notificacoes', level: 1 })).toBeVisible();
    await expect(page.locator('.agenda-calendar')).toBeVisible();
    await expectNoGlobalHorizontalOverflow(page);

    await loginViaUi(page, '/pacientes');
    await expect(page.getByRole('heading', { name: 'Pacientes' })).toBeVisible();
    await expect(page.getByText('Paciente Hemodinks')).toBeVisible();
    await expectNoGlobalHorizontalOverflow(page);
  }
});

test('cadastra e edita usuario usando o formulario real', async ({ page }) => {
  const apiState = await mockApi(page);
  await loginViaUi(page, '/usuarios');
  await expect(page.getByText('Ana Hemodinks')).toBeVisible();

  await page.getByRole('button', { name: 'Novo usuario' }).click();
  await expect(page.getByRole('heading', { name: 'Novo usuario' })).toBeVisible();
  await page.getByLabel('Nome completo').fill('Usuario E2E');
  await page.getByLabel('Email').fill('usuario.e2e@hemodinks.com');
  await page.getByLabel('Telefone').fill('81999999999');
  await page.locator('#user-birth-date').fill('10/05/1990');
  await page.locator('.module-form-grid select').first().selectOption('1');
  await page.getByRole('button', { name: 'Cadastrar usuario' }).click();

  await expect(page.getByText(/Usuario cadastrado/)).toBeVisible();
  await expect(page.getByText('Usuario E2E')).toBeVisible();
  expect(apiState.createdUserPayload).toMatchObject({
    nome: 'Usuario E2E',
    email: 'usuario.e2e@hemodinks.com',
    telefone: '+5581999999999',
    cpf: null,
    perfilId: 1,
  });

  await page.locator('tr', { hasText: 'Usuario E2E' }).getByTitle('Editar').click();
  await expect(page.getByRole('heading', { name: 'Editar usuario' })).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue('usuario.e2e@hemodinks.com');
  await page.getByLabel('Nome completo').fill('Usuario Editado');
  await page.getByRole('button', { name: 'Salvar alteracoes' }).click();

  await expect(page.getByText('Usuario atualizado.')).toBeVisible();
  await expect(page.getByText('Usuario Editado')).toBeVisible();
  expect(apiState.updatedUserPayload).toMatchObject({
    nome: 'Usuario Editado',
    email: 'usuario.e2e@hemodinks.com',
  });
});

test('cadastra e edita paciente usando o fluxo real do formulario', async ({ page }) => {
  const apiState = await mockApi(page);
  await loginViaUi(page, '/pacientes');
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();

  await page.getByRole('button', { name: 'Novo paciente' }).click();
  await expect(page.getByRole('heading', { name: 'Novo paciente' })).toBeVisible();
  await page.getByLabel('Paciente', { exact: true }).fill('Paciente Novo');
  await page.getByLabel('Hospital').fill('Santa Clara - Mater Dei');
  await page.getByLabel('Cirurgião').selectOption('1');
  await page.locator('input[list="hemodinks-convenios-options"]').fill('Particular');

  await page.getByRole('button', { name: 'Adicionar procedimento' }).click();
  await expect(page.getByRole('heading', { name: 'Selecionar procedimento' })).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(page.getByText('10101012')).toBeVisible();

  await page.getByRole('button', { name: 'Cadastrar paciente' }).click();
  await expect(page.getByText(/Paciente cadastrado/)).toBeVisible();
  await expect(page.getByText('Paciente Novo')).toBeVisible();
  expect(apiState.createdPacientePayload).toMatchObject({
    nomePaciente: 'Paciente Novo',
    cpf: '',
    telefone: '',
    hospitalId: 1,
    medicoUserId: 1,
    convenioId: 7,
    procedimento: 'Consulta',
  });

  await page.locator('tr', { hasText: 'Paciente Novo' }).getByTitle('Editar').click();
  await expect(page.getByRole('heading', { name: 'Editar paciente' })).toBeVisible();
  await page.getByLabel('Paciente', { exact: true }).fill('Paciente Editado');
  await page.getByRole('button', { name: 'Salvar paciente' }).click();
  await expect(page.getByText('Paciente atualizado.')).toBeVisible();
  await expect(page.getByText('Paciente Editado')).toBeVisible();
  expect(apiState.updatedPacientePayload).toMatchObject({
    nomePaciente: 'Paciente Editado',
    cpf: '',
    procedimento: 'Consulta',
  });
});

test('cadastra evento na agenda', async ({ page }) => {
  const apiState = await mockApi(page);
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  await loginViaUi(page, '/agenda');
  await expect(page.getByRole('heading', { name: 'Agenda e notificacoes', level: 1 })).toBeVisible();
  await page.locator('.agenda-tools').getByRole('button', { name: 'Novo evento' }).click();
  await expect(page.getByRole('heading', { name: 'Novo evento', level: 2 })).toBeVisible();
  await page.getByLabel('Titulo').fill('Evento E2E');
  await page.getByLabel('Descricao').fill('Validacao automatizada da agenda');
  await page.getByLabel('Inicio').fill(toDateInputValue(start));
  await page.getByLabel('Hora').first().fill(toTimeInputValue(start));
  await page.getByLabel('Termino').fill(toDateInputValue(end));
  await page.getByLabel('Hora').nth(1).fill(toTimeInputValue(end));
  await page.getByRole('button', { name: 'Cadastrar evento' }).click();

  await expect(page.getByText('Evento cadastrado.')).toBeVisible();
  await expect(page.getByText('Evento E2E')).toBeVisible();
  expect(apiState.createdEventPayload).toMatchObject({
    title: 'Evento E2E',
    description: 'Validacao automatizada da agenda',
    notifyUser: true,
  });
});

test('exporta pacientes em XLSX e PDF', async ({ page }) => {
  await mockApi(page);
  await loginViaUi(page, '/pacientes');
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();

  const xlsxDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar XLSX' }).click();
  const xlsxDownload = await xlsxDownloadPromise;
  expect(xlsxDownload.suggestedFilename()).toMatch(/^pacientes-hemodinks-\d{4}-\d{2}-\d{2}\.xlsx$/);

  const pdfDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar PDF' }).click();
  const pdfDownload = await pdfDownloadPromise;
  expect(pdfDownload.suggestedFilename()).toMatch(/^pacientes-hemodinks-\d{4}-\d{2}-\d{2}\.pdf$/);
});

test('bloqueia rota de usuarios para perfil paciente', async ({ page }) => {
  await mockApi(page, patientSession);
  await loginViaUi(page, '/usuarios', patientSession);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Painel inicial' })).toBeVisible();
  await expect(page.getByRole('button', { name: /abrir usuarios/i })).toHaveCount(0);
});

test('nao apresenta violacoes serias de acessibilidade nas rotas principais', async ({ page }) => {
  await mockApi(page);

  for (const route of ['/dashboard', '/usuarios', '/pacientes', '/agenda']) {
    await loginViaUi(page, route);
    await expect(page.locator('main, .app-shell, .login-shell').first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const blockingViolations = results.violations.filter((violation) => (
      violation.impact === 'serious' || violation.impact === 'critical'
    ));

    expect(blockingViolations, `${route}: ${blockingViolations.map((item) => item.id).join(', ')}`).toEqual([]);
  }
});

test('gera evidencias visuais desktop e mobile das telas principais', async ({ page }, testInfo) => {
  await mockApi(page);

  for (const width of [390, 1440]) {
    await captureRouteScreenshot(page, testInfo, '/dashboard', width);
    await captureRouteScreenshot(page, testInfo, '/usuarios', width);
    await captureRouteScreenshot(page, testInfo, '/pacientes', width);
    await captureRouteScreenshot(page, testInfo, '/agenda', width);

    await loginViaUi(page, '/usuarios');
    await page.getByRole('button', { name: 'Novo usuario' }).click();
    await expect(page.getByRole('heading', { name: 'Novo usuario' })).toBeVisible();
    await captureCurrentScreenshot(page, testInfo, 'usuarios-formulario', width);

    await loginViaUi(page, '/pacientes');
    await page.getByRole('button', { name: 'Novo paciente' }).click();
    await expect(page.getByRole('heading', { name: 'Novo paciente' })).toBeVisible();
    await captureCurrentScreenshot(page, testInfo, 'pacientes-formulario', width);
  }
});
