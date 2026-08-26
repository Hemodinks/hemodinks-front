import { expect, test, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { TUTORIALS, type TutorialId } from '../src/features/tutorials/tutorialRegistry';
import { getTutorialNarration } from '../src/features/tutorials/tutorialNarration';
import { TUTORIAL_MEDIA } from '../scripts/tutorials/library-config';

const LOGIN_PASSWORD = ['acesso', 'teste', 'ci'].join('-');

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    console.error(`[browser pageerror] ${error.stack ?? error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`[browser console] ${message.text()}`);
  });
});

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

const superAdminSession = {
  token: 'super-admin-token',
  user: {
    id: 100,
    nome: 'Super Administrador',
    email: 'superadmin@hemodinks.com',
    cpf: '39053344705',
    fotoPerfil: null,
    precisaTrocarSenha: false,
    perfilId: 5,
    perfilNome: 'SuperAdministrador',
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

const tutorialRecordingSession = {
  token: 'token-ficticio-da-gravacao',
  user: {
    id: 900,
    nome: 'Usuário Fictício',
    email: 'tutorial@example.invalid',
    cpf: '00000000000',
    fotoPerfil: null,
    precisaTrocarSenha: false,
    perfilId: 1,
    perfilNome: 'Administrador',
  },
};

const paciente = {
  id: 10,
  userId: 20,
  data: '2026-06-01T00:00:00Z',
  dataAtendimento: '2026-06-01T00:00:00Z',
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
  const clinicField = page.getByRole('combobox', { name: 'Clínica', exact: true });
  if (await clinicField.count() === 0) return;

  await clinicField.selectOption('1');
  await page.getByLabel('Email').fill(loginSession.user.email);
  await page.locator('#login-password').fill(LOGIN_PASSWORD);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

async function mockApi(page: Page, loginSession = session, options: { sanitizedTutorial?: boolean; billingAmount?: string } = {}) {
  const sanitizedPatient = options.sanitizedTutorial ? {
    ...paciente,
    nomePaciente: 'Registro Fictício 001',
    hospital: 'Hospital Demonstração',
    medico: 'Profissional Fictício',
    cpf: '',
    email: '',
    telefone: '',
    autorizacao: 'DEMO-001',
  } : { ...paciente, pagamento: options.billingAmount ?? paciente.pagamento };
  const state = {
    users: [user],
    pacientes: [sanitizedPatient],
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

    if (path === '/api/public/clinicas') {
      return route.fulfill({
        json: [{ id: 1, nome: 'Clínica Hemodinks', slug: 'clinica-hemodinks', fotoUrl: null }],
      });
    }

    if (path === '/api/platform/clinicas') {
      return route.fulfill({
        json: [{
          id: 1,
          nome: 'Clínica Hemodinks',
          slug: 'clinica-hemodinks',
          fotoUrl: null,
          ativa: true,
          plano: 'Completo',
          modulosLiberados: ['usuarios', 'pacientes', 'faturamento', 'grupos-medicos', 'agenda'],
          assinaturaStatus: 'Ativa',
          trialAte: null,
          assinaturaValidaAte: '2027-06-01T00:00:00Z',
          limiteUsuarios: 100,
          usuarios: 2,
          dataCadastro: '2026-01-01T00:00:00Z',
          dataAtualizacao: null,
        }],
      });
    }

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

    if (path === '/api/faturamentos-medicos/') {
      return route.fulfill({ json: paged(state.pacientes) });
    }

    if (path === '/api/faturamentos-medicos/historico/arquivos') {
      return route.fulfill({ json: [] });
    }

    if (path === '/api/monitoramento/erros') {
      if (method === 'DELETE') return route.fulfill({ json: { clearedAt: '2026-08-26T12:00:00Z' } });
      return route.fulfill({
        json: {
          items: [{
            timestamp: '2026-08-26T11:42:18Z',
            module: 'Faturamento',
            classFlow: ['BillingController', 'BillingService', 'BillingRepository'],
            method: 'ConsultarHistorico',
            line: 142,
            technicalDescription: 'Falha fictícia de demonstração ao consultar o histórico.',
            userName: 'Usuário Fictício',
            userEmail: 'tutorial@example.invalid',
            query: 'SELECT * FROM Faturamentos WHERE ClinicaId = @ClinicaId',
            databaseOperation: 'SELECT',
            requestId: 'demo-request-001',
          }],
          page: 1,
          pageSize: 25,
          totalItems: 1,
          totalPages: 1,
        },
      });
    }

    if (path === '/api/grupos-medicos/') {
      return route.fulfill({ json: paged([{
        id: 1,
        nome: 'Grupo Cirúrgico',
        ativo: true,
        dataCadastro: '2026-01-01T00:00:00Z',
        membrosCount: 1,
        membros: [{ userId: 1, nome: 'Dra. Ana', email: 'ana@hemodinks.com' }],
      }]) });
    }

    if (path === '/api/equipes/') {
      return route.fulfill({ json: [{
        id: 1,
        nome: 'Equipe Azul',
        usuarioLoginId: 99,
        email: 'equipe@hemodinks.com',
        modoIdentificacao: 'Nenhuma',
        ativa: true,
        membros: [{ userId: 1, nome: 'Dra. Ana', email: 'ana@hemodinks.com', perfilId: 2, operadorId: 1, operadorAtivo: true, possuiPin: false, precisaTrocarPin: false }],
      }] });
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

async function expectTableRowVisible(page: Page, tableSelector: string, rowText: string, loadingText: string) {
  await expect(page.getByText(loadingText)).toHaveCount(0);
  await expect(page.locator(`${tableSelector} tbody tr`, { hasText: rowText }).first()).toBeVisible();
}

async function captureRouteScreenshot(page: Page, testInfo: TestInfo, route: string, width: number) {
  await page.setViewportSize({ width, height: width < 600 ? 860 : 900 });
  await loginViaUi(page, route);
  if (route === '/relatorios') {
    await expect(page.getByText('Consulta analítica')).toBeVisible();
  }
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
  await page.getByLabel('Clínica').selectOption('1');
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

  await page.getByLabel('Sessão ativa').getByRole('button', { name: /agenda/i }).click();
  await expect(page).toHaveURL(/\/agenda$/);
  await expect(page.getByRole('heading', { name: 'Agenda e notificações', level: 1 })).toBeVisible();
  const openNewEventButton = page.locator('.agenda-tools').getByRole('button', { name: 'Novo evento' });
  await expect(openNewEventButton).toBeVisible();
  await openNewEventButton.click();
  await expect(page.getByRole('heading', { name: 'Novo evento', level: 2 })).toBeVisible();
});

test('abre o módulo de tutoriais interativos e carrega o vídeo de Relatórios', async ({ page }) => {
  await mockApi(page);
  await loginViaUi(page, '/dashboard');

  await page.getByLabel('Sessão ativa').getByRole('button', { name: 'Tutoriais interativos' }).click();
  await expect(page).toHaveURL(/\/tutoriais-interativos$/);
  await expect(page.getByRole('heading', { name: 'Tutoriais interativos', level: 2 })).toBeVisible();
  await expect(page.getByText('12', { exact: true })).toBeVisible();
  await expect(page.locator('.tutorial-video-card')).toHaveCount(12);
  await expect(page.getByRole('heading', { name: 'Relatórios — consulta analítica' })).toBeVisible();

  const video = page.getByLabel('Tutorial: Relatórios — consulta analítica');
  await expect(video).toBeVisible();
  await expect(video.locator('source[type="video/webm"]')).toHaveAttribute('src', '/tutorials/reports/tutorial-relatorios-narrado.webm');
  await expect(video.locator('source[type="video/mp4"]')).toHaveAttribute('src', '/tutorials/reports/tutorial-relatorios-narrado.mp4');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.duration)).toBeGreaterThan(80);
  await page.getByLabel('Velocidade: Relatórios — consulta analítica').selectOption('1.5');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => ({
    playbackRate: element.playbackRate,
    defaultPlaybackRate: element.defaultPlaybackRate,
  }))).toEqual({ playbackRate: 1.5, defaultPlaybackRate: 1.5 });
  await expectNoGlobalHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 860 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tutoriais interativos', level: 2 })).toBeVisible();
  await expect(page.getByLabel('Tutorial: Relatórios — consulta analítica')).toBeVisible();
  await expectNoGlobalHorizontalOverflow(page);
});

test('todos os tutoriais registrados possuem configuração e alvos estáveis', async ({ page }) => {
  await mockApi(page, superAdminSession);
  expect(Object.keys(TUTORIALS)).toHaveLength(12);
  for (const tutorial of Object.values(TUTORIALS)) {
    expect(tutorial.steps.length).toBeGreaterThanOrEqual(3);
    expect(tutorial.steps.every((step) => step.target.startsWith('[data-tour="'))).toBe(true);
    if (tutorial.view === 'login') {
      await page.goto('/');
    } else {
      const route = Object.entries({ dashboard: '/dashboard', users: '/usuarios', patients: '/pacientes', billing: '/faturamento-medico', reports: '/relatorios', clinics: '/clinicas', agenda: '/agenda' })
        .find(([view]) => view === tutorial.view)?.[1];
      expect(route).toBeTruthy();
      await loginViaUi(page, route!, superAdminSession);
    }
    await expect(page.locator(tutorial.steps[0].target)).toHaveCount(1);
  }
});

test('exibe o fluxo contextual correspondente para o SuperAdministrador', async ({ page }) => {
  await mockApi(page, superAdminSession);
  const routes = [
    ['/dashboard', 'Painel inicial'],
    ['/usuarios', 'Usuários'],
    ['/pacientes', 'Pacientes - Cirurgias'],
    ['/faturamento-medico', 'Faturamento médico'],
    ['/historico-faturamento', 'Histórico'],
    ['/relatorios', 'Relatórios'],
    ['/tutoriais-interativos', 'Tutoriais interativos'],
    ['/grupos-medicos', 'Grupos médicos'],
    ['/agenda', 'Agenda e notificações'],
    ['/opcoes', 'Opções'],
    ['/clinicas', 'Clínicas'],
  ] as const;

  for (const [route, title] of routes) {
    await loginViaUi(page, route, superAdminSession);
    await expect(page).toHaveURL(new RegExp(`${route.replaceAll('/', '\\/')}$`));

    const help = page.getByRole('complementary', { name: 'Ajuda contextual' });
    await help.getByRole('button', { name: new RegExp(`Abrir ajuda de ${title}`, 'i') }).click();
    await expect(help.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(help.locator('.contextual-flow-item').first().getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    await expectNoGlobalHorizontalOverflow(page);
    await help.getByRole('button', { name: 'Fechar ajuda da tela' }).click();
  }
});

test('consulta o histórico de faturamento por ano e mês', async ({ page }) => {
  await mockApi(page, superAdminSession, { billingAmount: 'R$ 125,45' });
  await loginViaUi(page, '/historico-faturamento', superAdminSession);

  await expect(page).toHaveURL(/\/historico-faturamento$/);
  await expect(page.getByRole('heading', { name: 'Histórico', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Meses de maior e menor faturamento' })).toBeVisible();

  const yearButton = page.getByRole('button', { name: /2026 1 atendimento/i });
  await expect(yearButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: /^Janeiro 0 atendimento/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Dezembro 0 atendimento/i })).toBeVisible();

  const juneButton = page.getByRole('button', { name: /^Junho 1 atendimento/i });
  await expect(juneButton.locator('..')).toHaveClass(/is-highest/);
  await expect(page.getByRole('button', { name: /^Abril 0 atendimento/i }).locator('..')).toHaveClass(/is-lowest/);
  await juneButton.click();
  await expect(juneButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('heading', { name: 'Total faturado em Junho' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Paciente Hemodinks Particular', exact: true })).toBeVisible();

  const mayButton = page.getByRole('button', { name: /^Maio 0 atendimento/i });
  await mayButton.click();
  await expect(mayButton).toHaveAttribute('aria-expanded', 'true');
  await expect(juneButton).toHaveAttribute('aria-expanded', 'false');

  await page.getByRole('tab', { name: 'Gráficos' }).click();
  await expect(page.getByRole('heading', { name: 'Faturamento por mês' })).toBeVisible();
  await expect(page.getByRole('group', { name: /Gráfico circular do faturamento trimestral de 2026/i })).toBeVisible();

  const juneBar = page.getByLabel(/Junho de 2026, 2º trimestre/i);
  await juneBar.hover();
  await expect(juneBar.getByRole('tooltip')).toContainText('Junho de 2026');
  await expect(juneBar.getByRole('tooltip')).toContainText('2º trimestre');

  const secondQuarterSlice = page.getByLabel(/^2º trimestre de 2026, Abril a Junho/i);
  await expect(secondQuarterSlice).toHaveAttribute('stroke', '#2563eb');
  const pieSvg = page.getByRole('group', { name: /Participação dos trimestres no faturamento de 2026/i });
  const pieBox = await pieSvg.boundingBox();
  expect(pieBox).not.toBeNull();
  await page.mouse.move(pieBox!.x + pieBox!.width / 2, pieBox!.y + pieBox!.height * (32 / 240));
  const pieTooltip = page.getByRole('group', { name: /Gráfico circular do faturamento trimestral de 2026/i }).getByRole('tooltip');
  await expect(pieTooltip).toBeVisible();
  await expect(pieTooltip).toContainText('2º trimestre de 2026');
  await expect(pieTooltip).toContainText('Abril a Junho');

  const fourthQuarterLegend = page.getByRole('button', { name: /Consultar 4º trimestre de 2026/i });
  await fourthQuarterLegend.focus();
  await expect(pieTooltip).toContainText('4º trimestre de 2026');
  await expect(pieTooltip).toContainText('Sem participação no faturamento anual');
  await expect(page.locator('.billing-history-pie-slice[stroke="#d97706"]')).toHaveCount(0);
  await expectNoGlobalHorizontalOverflow(page);
});

test('mantem telas criticas sem overflow horizontal no mobile', async ({ page }) => {
  await mockApi(page);

  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 860 });

    await loginViaUi(page, '/agenda');
    await expect(page.getByRole('heading', { name: 'Agenda e notificações', level: 1 })).toBeVisible();
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

  await page.getByRole('button', { name: 'Novo usuário' }).click();
  await expect(page.getByRole('heading', { name: 'Novo usuário' })).toBeVisible();
  await page.getByLabel('Nome completo').fill('Usuario E2E');
  await page.getByLabel('Email').fill('usuario.e2e@hemodinks.com');
  await page.getByLabel('Telefone').fill('81999999999');
  await page.locator('#user-birth-date').fill('10/05/1990');
  await page.locator('.module-form-grid select').first().selectOption('1');
  await page.getByRole('button', { name: 'Cadastrar usuário' }).click();

  await expect(page.getByText(/Usuário cadastrado/)).toBeVisible();
  await expect(page.getByText('Usuario E2E')).toBeVisible();
  expect(apiState.createdUserPayload).toMatchObject({
    nome: 'Usuario E2E',
    email: 'usuario.e2e@hemodinks.com',
    telefone: '+5581999999999',
    cpf: null,
    perfilId: 1,
  });

  await page.locator('tr', { hasText: 'Usuario E2E' }).getByTitle('Editar').click();
  await expect(page.getByRole('heading', { name: 'Editar usuário' })).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue('usuario.e2e@hemodinks.com');
  await page.getByLabel('Nome completo').fill('Usuario Editado');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  await expect(page.getByText('Usuário atualizado.')).toBeVisible();
  await expectTableRowVisible(page, '.users-table', 'Usuario Editado', 'Carregando usuários...');
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
  await page.getByRole('combobox', { name: 'Hospital', exact: true }).fill('Santa Clara - Mater Dei');
  await page.getByRole('combobox', { name: 'Cirurgião', exact: true }).fill(user.nome);
  await page.getByRole('combobox', { name: 'Convênio', exact: true }).fill('Particular');

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
  await expectTableRowVisible(page, '.patients-table', 'Paciente Editado', 'Carregando pacientes...');
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
  await expect(page.getByRole('heading', { name: 'Agenda e notificações', level: 1 })).toBeVisible();
  await page.locator('.agenda-tools').getByRole('button', { name: 'Novo evento' }).click();
  await expect(page.getByRole('heading', { name: 'Novo evento', level: 2 })).toBeVisible();
  await page.getByLabel('Título').fill('Evento E2E');
  await page.getByLabel('Descrição').fill('Validação automatizada da agenda');
  await page.getByLabel('Início').fill(toDateInputValue(start));
  await page.getByLabel('Hora').first().fill(toTimeInputValue(start));
  await page.getByLabel('Término').fill(toDateInputValue(end));
  await page.getByLabel('Hora').nth(1).fill(toTimeInputValue(end));
  await page.getByRole('button', { name: 'Cadastrar evento' }).click();

  await expect(page.getByText('Evento cadastrado.')).toBeVisible();
  await expect(page.getByText('Evento E2E')).toBeVisible();
  expect(apiState.createdEventPayload).toMatchObject({
    title: 'Evento E2E',
    description: 'Validação automatizada da agenda',
    notifyUser: true,
  });
});

test('exporta pacientes em planilha e PDF', async ({ page }) => {
  await mockApi(page);
  await loginViaUi(page, '/pacientes');
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();

  const xlsxDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar Planilha' }).click();
  const xlsxDownload = await xlsxDownloadPromise;
  expect(xlsxDownload.suggestedFilename()).toMatch(/^pacientes-hemodinks-\d{4}-\d{2}-\d{2}\.xlsx$/);

  const pdfDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar PDF' }).click();
  const pdfDownload = await pdfDownloadPromise;
  expect(pdfDownload.suggestedFilename()).toMatch(/^pacientes-hemodinks-\d{4}-\d{2}-\d{2}\.pdf$/);
});

test('consulta e exporta relatórios com filtros múltiplos', async ({ page }) => {
  await mockApi(page);
  await loginViaUi(page, '/relatorios');
  await expect(page).toHaveURL(/\/relatorios$/);
  await expect(page.getByRole('heading', { name: 'Relatórios', level: 1 })).toBeVisible();
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();

  await page.getByRole('textbox', { name: 'Data inicial do atendimento', exact: true }).fill('01/06/2026');
  const doctorsFilter = page.getByRole('combobox', { name: 'Médicos', exact: true });
  await doctorsFilter.fill('Dra. Ana');
  await doctorsFilter.press('Enter');
  const teamsFilter = page.getByRole('combobox', { name: 'Equipes', exact: true });
  await teamsFilter.fill('Equipe Azul');
  await teamsFilter.press('Enter');
  await page.getByRole('button', { name: 'Consultar' }).click();
  await expect(page.getByText('1 atendimento(s) encontrados')).toBeVisible();

  const xlsxDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar Planilha' }).click();
  expect((await xlsxDownloadPromise).suggestedFilename()).toMatch(/^relatorios-hemodinks-\d{4}-\d{2}-\d{2}\.xlsx$/);

  const pdfDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar PDF' }).click();
  expect((await pdfDownloadPromise).suggestedFilename()).toMatch(/^relatorios-hemodinks-\d{4}-\d{2}-\d{2}\.pdf$/);
});

test('bloqueia rota de usuarios para perfil paciente', async ({ page }) => {
  await mockApi(page, patientSession);
  await loginViaUi(page, '/usuarios', patientSession);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Painel inicial' })).toBeVisible();
  await expect(page.getByRole('button', { name: /abrir usuários/i })).toHaveCount(0);
});

test('protege relatórios com a autorização provisória do faturamento', async ({ page }) => {
  await mockApi(page, patientSession);
  await loginViaUi(page, '/relatorios', patientSession);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByLabel('Sessão ativa').getByRole('button', { name: 'Relatórios' })).toHaveCount(0);
});

test('nao apresenta violacoes serias de acessibilidade nas rotas principais', async ({ page }) => {
  await mockApi(page);

  for (const route of ['/dashboard', '/usuarios', '/pacientes', '/relatorios', '/agenda']) {
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
    await captureRouteScreenshot(page, testInfo, '/relatorios', width);
    await captureRouteScreenshot(page, testInfo, '/agenda', width);

    await loginViaUi(page, '/usuarios');
    await page.getByRole('button', { name: 'Novo usuário' }).click();
    await expect(page.getByRole('heading', { name: 'Novo usuário' })).toBeVisible();
    await captureCurrentScreenshot(page, testInfo, 'usuarios-formulario', width);

    await loginViaUi(page, '/pacientes');
    await page.getByRole('button', { name: 'Novo paciente' }).click();
    await expect(page.getByRole('heading', { name: 'Novo paciente' })).toBeVisible();
    await captureCurrentScreenshot(page, testInfo, 'pacientes-formulario', width);
  }
});

test('gera capturas sanitizadas para o carrossel do portfolio', async ({ page }) => {
  const outputDir = process.env.PORTFOLIO_SCREENSHOTS_DIR;
  test.skip(!outputDir, 'Executado somente para atualizar as imagens publicas do portfolio.');
  await mkdir(outputDir!, { recursive: true });
  await mockApi(page, superAdminSession, { billingAmount: 'R$ 1.250,45' });
  await page.setViewportSize({ width: 1600, height: 1000 });

  const capture = async (fileName: string) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: resolve(outputDir!, fileName),
      type: 'jpeg',
      quality: 88,
      fullPage: false,
      animations: 'disabled',
    });
  };

  const captureRoute = async (route: string, fileName: string) => {
    await loginViaUi(page, route, superAdminSession);
    await expect(page.locator('main.app-shell')).toBeVisible();
    const readySelector = route === '/dashboard' ? '.dashboard-workspace' : 'main.app-shell .workspace';
    await expect(page.locator(readySelector).first()).toBeVisible();
    await capture(fileName);
  };

  await captureRoute('/dashboard', '01-painel-inicial.jpg');
  await captureRoute('/tutoriais-interativos', '02-tutoriais-interativos.jpg');
  await captureRoute('/usuarios', '03-usuarios.jpg');
  await captureRoute('/pacientes', '04-pacientes-cirurgias.jpg');
  await captureRoute('/faturamento-medico', '05-gestao-faturamento.jpg');
  await captureRoute('/relatorios', '06-relatorios.jpg');
  await captureRoute('/historico-faturamento', '07-historico-faturamento.jpg');
  await page.getByRole('tab', { name: 'Gráficos' }).click();
  await expect(page.getByRole('heading', { name: 'Faturamento por mês' })).toBeVisible();
  await capture('08-graficos-faturamento.jpg');
  await captureRoute('/grupos-medicos', '09-grupos-medicos.jpg');
  await captureRoute('/agenda', '10-agenda-notificacoes.jpg');
  await captureRoute('/clinicas', '11-clinicas.jpg');
  await captureRoute('/opcoes', '12-configuracoes.jpg');
  await page.getByRole('button', { name: 'Monitoramento' }).click();
  await expect(page.getByRole('heading', { name: 'Monitoramento' })).toBeVisible();
  await capture('13-monitoramento.jpg');
});

async function openReportsTutorial(page: Page) {
  await expect(page.locator('[data-tour="reports-overview"]')).toBeVisible();
  const helpButton = page.getByRole('complementary', { name: 'Ajuda contextual' })
    .getByRole('button', { name: /abrir ajuda de relatórios/i });
  await expect(helpButton).toBeVisible();
  await helpButton.click();
  const startButton = page.getByRole('button', { name: /iniciar missão: dominar os relatórios|reiniciar missão: dominar os relatórios/i });
  await expect(startButton).toBeVisible();
  await startButton.click();
  await expect(page.locator('.tutorial-mission-popover')).toBeVisible();
}

async function expectActiveTourTarget(page: Page, target: string) {
  await expect(page.locator(`[data-tour="${target}"]`)).toHaveClass(/driver-active-element/);
}

test('tutorial de relatórios usa somente alvos data-tour existentes e conclui após as ações', async ({ page }) => {
  await mockApi(page);
  await loginViaUi(page, '/relatorios');
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();

  for (const target of [
    'reports-overview',
    'reports-filters',
    'reports-period',
    'reports-combined-filters',
    'reports-apply',
    'reports-summary',
    'reports-results',
  ]) {
    await expect(page.locator(`[data-tour="${target}"]`)).toHaveCount(1);
  }

  await openReportsTutorial(page);
  const mission = page.locator('.tutorial-mission-popover');
  await expect(mission).toContainText('Etapa 1 de 7');
  await expectActiveTourTarget(page, 'reports-overview');
  await mission.getByRole('button', { name: 'Continuar tutorial' }).click();
  await expect(mission).toContainText('Etapa 2 de 7');
  await expectActiveTourTarget(page, 'reports-filters');
  await mission.getByRole('button', { name: 'Continuar tutorial' }).click();
  await expect(mission).toContainText('Etapa 3 de 7');
  await expectActiveTourTarget(page, 'reports-period');

  await page.waitForTimeout(250);
  await expect(mission).toContainText('Etapa 3 de 7');
  await page.getByRole('textbox', { name: 'Data inicial do atendimento', exact: true }).click();
  await expect(mission).toContainText('Etapa 4 de 7');
  await expectActiveTourTarget(page, 'reports-combined-filters');
  await mission.getByRole('button', { name: 'Continuar tutorial' }).click();
  await expect(mission).toContainText('Etapa 5 de 7');
  await expectActiveTourTarget(page, 'reports-apply');
  await page.getByRole('button', { name: 'Consultar' }).click();
  await expect(mission).toContainText('Etapa 6 de 7');
  await expectActiveTourTarget(page, 'reports-summary');
  await mission.getByRole('button', { name: 'Continuar tutorial' }).click();
  await expect(mission).toContainText('Etapa 7 de 7');
  await expectActiveTourTarget(page, 'reports-results');
  await mission.getByRole('button', { name: 'Concluir tutorial' }).click();
  await expect(page.getByRole('status')).toContainText('Missão concluída');

  await page.getByRole('button', { name: 'Fechar mensagem do tutorial' }).click();
  await page.getByRole('complementary', { name: 'Ajuda contextual' }).getByRole('button', { name: /abrir ajuda de relatórios/i }).click();
  await expect(page.getByRole('button', { name: 'Reiniciar Missão: dominar os relatórios' })).toBeVisible();
  await page.getByRole('button', { name: 'Reiniciar Missão: dominar os relatórios' }).click();
  await expect(mission).toContainText('Etapa 1 de 7');
  await mission.getByRole('button', { name: 'Sair do tutorial' }).click();
});

test('tutorial valida MP3, preferência persistente e navegação por teclado', async ({ page }) => {
  await page.addInitScript(() => {
    const speechState = { cancelCount: 0, spoken: [] as Array<{ text: string; lang: string; rate: number }> };
    class MockUtterance {
      text: string;
      lang = '';
      rate = 1;
      voice: SpeechSynthesisVoice | null = null;
      constructor(text: string) { this.text = text; }
    }
    Object.defineProperty(window, '__tutorialSpeechState', { value: speechState });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: MockUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: () => { speechState.cancelCount += 1; },
        pause: () => undefined,
        resume: () => undefined,
        getVoices: () => [{ lang: 'pt-BR', name: 'Voz de teste' }],
        speak: (utterance: MockUtterance) => speechState.spoken.push({ text: utterance.text, lang: utterance.lang, rate: utterance.rate }),
      },
    });
  });
  await mockApi(page);
  await loginViaUi(page, '/relatorios');
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();
  await openReportsTutorial(page);

  const mission = page.locator('.tutorial-mission-popover');
  const runtime = page.locator('[data-tutorial-audio-state]');
  const speech = () => page.evaluate(() => (window as typeof window & { __tutorialSpeechState: { cancelCount: number; spoken: Array<{ text: string; lang: string; rate: number }> } }).__tutorialSpeechState);
  await expect(runtime).toHaveAttribute('data-tutorial-audio-state', 'playing');
  expect((await speech()).spoken).toHaveLength(0);

  const initialCancelCount = (await speech()).cancelCount;
  await mission.getByRole('button', { name: 'Pausar narração' }).click();
  await expect(mission.getByRole('button', { name: 'Continuar narração' })).toHaveAttribute('aria-pressed', 'false');
  await expect(runtime).toHaveAttribute('data-tutorial-audio-state', 'paused');
  expect((await speech()).cancelCount).toBeGreaterThanOrEqual(initialCancelCount);
  const spokenBeforeReactivate = (await speech()).spoken.length;
  await mission.getByRole('button', { name: 'Continuar narração' }).click();
  await expect(runtime).toHaveAttribute('data-tutorial-audio-state', 'playing');
  expect((await speech()).spoken.length).toBe(spokenBeforeReactivate);
  await mission.getByRole('button', { name: 'Repetir narração' }).click();
  await expect(runtime).toHaveAttribute('data-tutorial-audio-state', 'playing');
  expect((await speech()).spoken.length).toBe(spokenBeforeReactivate);
  await mission.getByRole('button', { name: 'Desativar narração' }).click();
  await expect(runtime).toHaveAttribute('data-tutorial-audio-state', 'disabled');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('hemodinks.tutorials.narration-enabled'))).toBe('false');
  await mission.getByRole('button', { name: 'Ativar narração' }).click();
  await expect(runtime).toHaveAttribute('data-tutorial-audio-state', 'playing');

  const preference = mission.getByRole('checkbox', { name: 'Não mostrar este tutorial novamente' });
  await preference.check();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('hemodinks.tutorials.hidden'))).toContain('reports-analytics');

  await page.keyboard.press('ArrowRight');
  await expect(mission).toContainText('Etapa 2 de 7');
  await page.keyboard.press('ArrowRight');
  await expect(mission).toContainText('Etapa 3 de 7');
  await page.keyboard.press('ArrowRight');
  await expect(mission).toContainText('Etapa 3 de 7');
  await page.getByRole('textbox', { name: 'Data inicial do atendimento', exact: true }).click();
  await expect(mission).toContainText('Etapa 4 de 7');
  await page.keyboard.press('ArrowLeft');
  await expect(mission).toContainText('Etapa 3 de 7');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.matches('.driver-active-element *, .tutorial-mission-popover *'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(mission).toHaveCount(0);

  await openReportsTutorial(page);
  await expect(mission.getByRole('checkbox', { name: 'Não mostrar este tutorial novamente' })).toBeChecked();
  await mission.getByRole('button', { name: 'Sair do tutorial' }).click();
});

test('tutorial usa Web Speech apenas como fallback quando o MP3 falha', async ({ page }) => {
  await page.route('**/tutorials/audio/**', (route) => route.abort());
  await page.addInitScript(() => {
    const state = { spoken: [] as string[] };
    class MockUtterance { lang = ''; rate = 1; voice = null; constructor(public text: string) {} }
    Object.defineProperty(window, '__tutorialFallbackState', { value: state });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: MockUtterance });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      cancel: () => undefined, pause: () => undefined, resume: () => undefined,
      getVoices: () => [{ lang: 'pt-BR', name: 'Fallback de teste' }],
      speak: (utterance: MockUtterance) => state.spoken.push(utterance.text),
    } });
  });
  await mockApi(page);
  await loginViaUi(page, '/relatorios');
  await openReportsTutorial(page);
  await expect(page.locator('[data-tutorial-audio-state]')).toHaveAttribute('data-tutorial-audio-state', 'error');
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __tutorialFallbackState: { spoken: string[] } }).__tutorialFallbackState.spoken.length)).toBeGreaterThan(0);
  await page.locator('.tutorial-mission-popover').getByRole('button', { name: 'Sair do tutorial' }).click();
});

test('tutorial respeita prefers-reduced-motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockApi(page);
  await loginViaUi(page, '/relatorios');
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();
  await openReportsTutorial(page);
  const mission = page.locator('.tutorial-mission-popover');
  await mission.getByRole('button', { name: 'Continuar tutorial' }).click();
  await mission.getByRole('button', { name: 'Continuar tutorial' }).click();
  await expect(mission).toContainText('Etapa 3 de 7');
  await expect(page.locator('[data-tour="reports-period"]')).toHaveCSS('animation-name', 'none');
  await mission.getByRole('button', { name: 'Sair do tutorial' }).click();
});

test('tutorial permite voltar, repetir narração e sair sem executar ações pelo usuário', async ({ page }) => {
  await mockApi(page);
  await loginViaUi(page, '/relatorios');
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();
  await openReportsTutorial(page);

  const mission = page.locator('.tutorial-mission-popover');
  await mission.getByRole('button', { name: 'Continuar tutorial' }).click();
  await expect(mission).toContainText('Etapa 2 de 7');
  await mission.getByRole('button', { name: 'Repetir narração' }).click();
  await mission.getByRole('button', { name: 'Voltar para a etapa anterior' }).click();
  await expect(mission).toContainText('Etapa 1 de 7');
  await mission.getByRole('button', { name: 'Sair do tutorial' }).click();
  await expect(mission).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Relatórios', level: 1 })).toBeVisible();
});

test('tutorial encerra de forma amigável quando um alvo não existe', async ({ page }) => {
  await mockApi(page);
  await loginViaUi(page, '/relatorios');
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();
  await page.locator('[data-tour="reports-results"]').evaluate((element) => element.remove());

  await page.getByRole('complementary', { name: 'Ajuda contextual' })
    .getByRole('button', { name: /abrir ajuda de relatórios/i })
    .click();
  await page.getByRole('button', { name: /iniciar missão: dominar os relatórios/i }).click();
  await expect(page.getByRole('status')).toContainText('foi encerrada com segurança');
  await expect(page.locator('.tutorial-mission-popover')).toHaveCount(0);
});

test('tutorial de relatórios funciona em desktop e mobile e respeita o perfil', async ({ page }) => {
  const isValidationCapture = process.env.TUTORIAL_CAPTURE_VALIDATION === '1';
  const validationSession = isValidationCapture ? tutorialRecordingSession : session;
  await mockApi(page, validationSession, { sanitizedTutorial: isValidationCapture });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await loginViaUi(page, '/relatorios', validationSession);
    await expect(page.getByText(isValidationCapture ? 'Registro Fictício 001' : 'Paciente Hemodinks')).toBeVisible();
    await openReportsTutorial(page);
    await expect(page.locator('.tutorial-mission-popover')).toBeVisible();
    await expectNoGlobalHorizontalOverflow(page);
    if (isValidationCapture) {
      const mission = page.locator('.tutorial-mission-popover');
      await mission.getByRole('button', { name: 'Continuar tutorial' }).click();
      await mission.getByRole('button', { name: 'Continuar tutorial' }).click();
      await expect(mission).toContainText('Etapa 3 de 7');
      await page.screenshot({ path: `artifacts/tutorials/validation/reports-${width}.png` });
    }
    await page.locator('.tutorial-mission-popover').getByRole('button', { name: 'Sair do tutorial' }).click();
  }

  await page.evaluate(() => sessionStorage.clear());
  await mockApi(page, patientSession);
  await loginViaUi(page, '/relatorios', patientSession);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('[data-tour="start-reports-tutorial"]')).toHaveCount(0);
});

test('grava tutorial local de relatórios com dados sanitizados', async ({ page }) => {
  test.skip(process.env.TUTORIAL_LOCAL_RECORDING !== '1', 'Executado somente pelo script de gravação local.');
  const timelineOutput = resolve('artifacts/tutorials/reports/timeline.json');
  const tutorial = TUTORIALS['reports-analytics'];
  const postNarrationMs = 650;
  const recordingOriginEpochMs = Date.now();
  const timelineSteps: Array<{
    index: number;
    id: string;
    visualStartMs: number;
    narrationStartMs: number;
    narrationEndMs: number;
    actionAtMs: number;
  }> = [];
  const elapsed = () => Date.now() - recordingOriginEpochMs;
  const pause = (milliseconds: number) => page.waitForTimeout(milliseconds);
  await mockApi(page, tutorialRecordingSession, { sanitizedTutorial: true });
  await page.addInitScript((storedSession) => {
    sessionStorage.setItem('hemodinks.session', JSON.stringify(storedSession));
  }, tutorialRecordingSession);
  await page.goto('/relatorios');
  await expect(page.getByText('Registro Fictício 001')).toBeVisible();
  await expect(page.getByLabel('Usuário logado').getByText('Usuário Fictício')).toBeVisible();
  await expect(page.getByText('tutorial@example.invalid')).toBeVisible();
  await pause(700);
  await page.getByRole('complementary', { name: 'Ajuda contextual' }).getByRole('button', { name: /abrir ajuda de relatórios/i }).click();
  await pause(700);
  await page.getByRole('button', { name: /iniciar missão: dominar os relatórios|reiniciar missão: dominar os relatórios/i }).click();
  const mission = page.locator('.tutorial-mission-popover');
  const runtime = page.locator('[data-tutorial-audio-state]');
  for (const [position, step] of tutorial.steps.entries()) {
    const index = position + 1;
    const narration = getTutorialNarration(step);
    if (!narration.audio) throw new Error(`Etapa ${step.id} não possui MP3 estático.`);
    await expect(mission).toContainText(`Etapa ${index} de ${tutorial.steps.length}`);
    const visualStartMs = elapsed();
    await expect(runtime).toHaveAttribute('data-tutorial-step', step.id);
    await expect(runtime).toHaveAttribute('data-tutorial-audio-state', 'playing');
    const narrationStartMs = elapsed();
    await expect(runtime).toHaveAttribute('data-tutorial-audio-state', 'finished', { timeout: 60_000 });
    const narrationEndMs = elapsed();
    await pause(postNarrationMs);
    const actionAtMs = elapsed();
    timelineSteps.push({ index, id: step.id, visualStartMs, narrationStartMs, narrationEndMs, actionAtMs });
    if (step.interaction?.type === 'click') await page.locator(step.interaction.target).click();
    else await mission.getByRole('button', { name: position === tutorial.steps.length - 1 ? 'Concluir tutorial' : 'Continuar tutorial' }).click();
  }
  await expect(page.getByRole('status')).toContainText('Missão concluída');
  await pause(900);
  await mkdir(dirname(timelineOutput), { recursive: true });
  await writeFile(timelineOutput, JSON.stringify({
    tutorialId: tutorial.id,
    recordingOriginEpochMs,
    preNarrationMs: 0,
    postNarrationMs,
    completedAtMs: elapsed(),
    steps: timelineSteps,
  }, null, 2));
});

const libraryRecordingRoutes: Partial<Record<TutorialId, string>> = {
  'login-clinic': '/',
  'clinic-registration': '/clinicas',
  'team-identification': '/clinicas',
  'patient-registration': '/pacientes',
  'surgery-registration': '/pacientes',
  'billing-management': '/faturamento-medico',
  'report-export': '/relatorios',
  'full-text-search': '/pacientes',
  'user-access': '/usuarios',
  'clinic-switch': '/clinicas',
  'agenda-notifications': '/agenda',
};

for (const tutorialId of Object.keys(libraryRecordingRoutes) as TutorialId[]) {
  test(`grava biblioteca sanitizada: ${tutorialId}`, async ({ page }, testInfo) => {
    test.skip(process.env.TUTORIAL_LIBRARY_RECORDING !== '1');
    const tutorial = TUTORIALS[tutorialId];
    const media = TUTORIAL_MEDIA[tutorialId];
    const recordingSession = tutorialId.startsWith('clinic-') || tutorialId === 'team-identification'
      ? { ...superAdminSession, token: 'token-ficticio-biblioteca', user: { ...superAdminSession.user, nome: 'Administrador Fictício', email: 'admin@example.invalid' } }
      : { ...session, token: 'token-ficticio-biblioteca', user: { ...session.user, nome: 'Usuário Fictício', email: 'tutorial@example.invalid' } };
    await mockApi(page, recordingSession, { sanitizedTutorial: true });
    const route = libraryRecordingRoutes[tutorialId]!;
    if (tutorialId === 'login-clinic') {
      await page.goto('/');
      await page.getByLabel('Clínica').selectOption('1');
      await page.getByLabel('Email').fill('tutorial@example.invalid');
      await page.locator('#login-password').fill('credencial-ficticia');
    } else {
      await loginViaUi(page, route, recordingSession);
      if (tutorialId === 'billing-management') {
        const summary = page.locator('.billing-filters-summary');
        if (await summary.getAttribute('aria-expanded') !== 'true') await summary.click();
      }
    }
    await page.waitForTimeout(700);
    const origin = Date.now();
    if (tutorialId === 'login-clinic') {
      await page.getByRole('button', { name: 'Tutorial de acesso' }).click();
    } else {
      const help = page.getByRole('complementary', { name: 'Ajuda contextual' });
      await help.getByRole('button', { name: /Abrir ajuda/i }).click();
      await page.locator(`[data-tour="start-${tutorialId}-tutorial"]`).click();
    }
    const timeline = { tutorialId, slug: media.slug, completedAtMs: 0, steps: [] as Array<Record<string, number | string>> };
    const runtime = page.locator('[data-tutorial-audio-state]');
    for (const [index, step] of tutorial.steps.entries()) {
      await expect(page.locator(step.target)).toBeVisible({ timeout: 10_000 });
      const visualStartMs = Date.now() - origin;
      await expect(runtime).toHaveAttribute('data-tutorial-step', step.id);
      await expect(runtime).toHaveAttribute('data-tutorial-audio-state', 'playing');
      const narrationStartMs = Date.now() - origin;
      await expect(runtime).toHaveAttribute('data-tutorial-audio-state', 'finished', { timeout: 60_000 });
      const narrationEndMs = Date.now() - origin;
      await page.waitForTimeout(650);
      if (step.interaction?.type === 'click') await page.locator(step.interaction.target).click();
      else await page.locator('.tutorial-mission-popover').getByRole('button', { name: index === tutorial.steps.length - 1 ? 'Concluir tutorial' : 'Continuar tutorial' }).click();
      timeline.steps.push({ index: index + 1, id: step.id, visualStartMs, narrationStartMs, narrationEndMs, actionAtMs: Date.now() - origin });
    }
    await page.waitForTimeout(800);
    timeline.completedAtMs = Date.now() - origin;
    await writeFile(testInfo.outputPath('timeline.json'), `${JSON.stringify(timeline, null, 2)}\n`, 'utf8');
  });
}
