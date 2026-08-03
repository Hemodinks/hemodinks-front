import type { Page } from '@playwright/test';
import {
  agendaEvent,
  billingAttendance,
  billingRecords,
  cbhpmItem,
  financeAccount,
  LOGIN_PASSWORD,
  negotiatedPrice,
  opmeFornecedor,
  paciente,
  paged,
  session,
  user,
} from './fixtures';
import {
  buildAgendaEventFromPayload,
  buildPacienteFromPayload,
  buildUserFromPayload,
  type Payload,
} from './builders';

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
