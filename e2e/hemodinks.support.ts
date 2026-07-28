import { expect, type Page, type TestInfo } from '@playwright/test';

export const LOGIN_PASSWORD = ['acesso', 'teste', 'ci'].join('-');

export const session = {
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
    clinicaId: 1,
    clinicaSlug: 'clinica-e2e',
  },
};

export const patientSession = {
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

export const paciente = {
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

export const cbhpmItem = {
  id: 1,
  codigo: '1.01.01.01-2',
  porte: '2B',
  procedimento: 'Consulta',
  valorReferencia: 120,
};

export const opmeFornecedor = {
  idFornecedor: 1,
  fornecedor: 'Promedom',
};

export const user = {
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

export const agendaEvent = {
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

export const billingAttendance = {
  id: 40,
  pacienteId: paciente.id,
  paciente: paciente.nomePaciente,
  dataProcedimento: '2026-07-10',
  convenioId: 7,
  medicoResponsavelId: user.id,
  status: 'Realizado',
  procedimentos: [
    {
      id: 401,
      cbhpmCodigo: '1.01.01.01-2',
      descricao: 'Consulta',
      quantidade: 1,
      pesoPercentual: 100,
      valorReferencia: 120,
      valorNegociado: 120,
      ordem: 1,
    },
  ],
};

export const billingRecords = ['Enviado', 'Aprovado', 'ProntoParaEnvio'].map((status, index) => ({
  id: 50 + index,
  atendimentoCirurgicoId: billingAttendance.id,
  pacienteId: paciente.id,
  paciente: `Paciente faturamento ${index + 1}`,
  convenioId: 7,
  numeroGuia: `GUIA-${index + 1}`,
  competencia: '2026-07-01',
  valorApresentado: 120,
  valorGlosado: 0,
  valorGlosaRecuperada: 0,
  valorReconhecido: 120,
  status,
  rowVersion: '',
  itens: [
    {
      id: 501 + index,
      codigo: '1.01.01.01-2',
      descricao: 'Consulta',
      quantidade: 1,
      pesoPercentual: 100,
      valorUnitario: 120,
      valorApresentado: 120,
      valorGlosado: 0,
      valorAprovado: 120,
      status: 'Aprovado',
      ordem: 1,
    },
  ],
  glosas: [],
}));

export const financeAccount = {
  id: 60,
  faturamentoId: billingRecords[0].id,
  pacienteId: paciente.id,
  paciente: paciente.nomePaciente,
  convenioId: 7,
  numeroDocumento: 'FAT-E2E-01',
  descricao: 'Honorários médicos',
  competencia: '2026-07-01',
  dataEmissao: '2026-07-10',
  dataVencimento: '2026-07-30',
  valorOriginal: 400,
  valorAjustado: 400,
  valorRecebido: 200,
  saldoAberto: 200,
  status: 'ParcialmenteRecebido',
  rowVersion: '',
  recebimentos: [
    {
      id: 601,
      dataRecebimento: '2026-07-23',
      valorRecebido: 200,
      formaRecebimento: 'Pix',
      documentoComprovante: 'comprovante.pdf',
      estornado: false,
    },
  ],
};

export const negotiatedPrice = {
  id: 70,
  convenioId: 7,
  cbhpmCodigo: '1.01.01.01-2',
  valorNegociado: 200,
  percentualPrincipal: 100,
  percentualAuxiliar1: 0,
  percentualAuxiliar2: 0,
  vigenciaInicio: '2026-07-24',
  vigenciaFinal: '2026-07-30',
  ativo: true,
};

export function paged<T>(items: T[]) {
  return {
    items,
    page: 1,
    pageSize: 10,
    totalItems: items.length,
    totalPages: 1,
  };
}

export type Payload = Record<string, unknown>;

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toTimeInputValue(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function buildPacienteFromPayload(id: number, payload: Payload) {
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

export function buildUserFromPayload(id: number, payload: Payload) {
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

export function buildAgendaEventFromPayload(id: number, payload: Payload) {
  return {
    ...agendaEvent,
    id,
    title: String(payload.title ?? agendaEvent.title),
    description: typeof payload.description === 'string' ? payload.description : null,
    start: String(payload.start ?? agendaEvent.start),
    end: String(payload.end ?? agendaEvent.end),
    notifyMedicalProfile: Boolean(payload.notifyMedicalProfile),
    notifyUser: Boolean(payload.notifyUser),
    reminderPeriodMinutes: Number(
      payload.reminderPeriodMinutes ?? agendaEvent.reminderPeriodMinutes,
    ),
  };
}

export async function loginViaUi(page: Page, initialRoute = '/', loginSession = session) {
  await page.goto(initialRoute);
  await page.getByLabel('Clínica').selectOption('1');
  await page.getByLabel('Email').fill(loginSession.user.email);
  await page.locator('#login-password').fill(LOGIN_PASSWORD);
  await page.getByRole('button', { name: /entrar/i }).click();
}

export async function mockApi(page: Page, loginSession = session) {
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

    if (path === '/api/public/clinicas') {
      return route.fulfill({
        json: [{ id: 1, nome: 'Clínica E2E', slug: 'clinica-e2e' }],
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

    if (path === '/api/atendimentos-cirurgicos/') {
      return route.fulfill({ json: [billingAttendance] });
    }

    if (path === '/api/faturamentos/') {
      return route.fulfill({ json: billingRecords });
    }

    if (path === '/api/financeiro/contas-receber/') {
      return route.fulfill({ json: [financeAccount] });
    }

    if (path === '/api/financeiro/contas-receber/pesquisa') {
      return route.fulfill({ json: paged([financeAccount]) });
    }

    if (path === '/api/financeiro/relatorios/resumo') {
      return route.fulfill({
        json: {
          valorApresentado: 400,
          valorGlosado: 0,
          valorRecuperado: 0,
          valorReconhecido: 400,
          valorRecebido: 200,
          saldoAberto: 200,
          valorVencido: 0,
          recebimentosPeriodo: 200,
          titulosVencidos: 0,
          porCompetencia: [],
        },
      });
    }

    if (path === '/api/convenios-procedimentos-precos/') {
      return route.fulfill({ json: [negotiatedPrice] });
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
          users: [
            {
              id: user.id,
              nome: user.nome,
              email: user.email,
              perfilId: user.perfilId,
              perfilNome: user.perfilNome,
            },
          ],
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

export async function expectNoGlobalHorizontalOverflow(page: Page) {
  await expect(
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).resolves.toBe(true);
}

export async function expectTableRowVisible(
  page: Page,
  tableSelector: string,
  rowText: string,
  loadingText: string,
) {
  await expect(page.getByText(loadingText)).toHaveCount(0);
  await expect(
    page.locator(`${tableSelector} tbody tr`, { hasText: rowText }).first(),
  ).toBeVisible();
}

export async function captureRouteScreenshot(
  page: Page,
  testInfo: TestInfo,
  route: string,
  width: number,
) {
  await page.setViewportSize({ width, height: width < 600 ? 860 : 900 });
  await loginViaUi(page, route);
  if (route === '/financeiro') {
    await expect(page.locator('.billing-finance-receipt-panel')).toBeVisible();
  }
  if (route === '/faturamento-medico') {
    await expect(page.locator('.billing-flow-table')).toBeVisible();
  }
  await expect(page.getByText('Carregando módulo...')).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath(`${route.replace('/', '') || 'home'}-${width}.png`),
    fullPage: true,
  });
  await expectNoGlobalHorizontalOverflow(page);
}

export async function captureCurrentScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
  width: number,
) {
  await page.setViewportSize({ width, height: width < 600 ? 860 : 900 });
  await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: true });
  await expectNoGlobalHorizontalOverflow(page);
}
