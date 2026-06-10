import { expect, test, type Page } from '@playwright/test';

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

function paged<T>(items: T[]) {
  return {
    items,
    page: 1,
    pageSize: 10,
    totalItems: items.length,
    totalPages: 1,
  };
}

type PacientePayload = Record<string, unknown>;

function buildPacienteFromPayload(id: number, payload: PacientePayload) {
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

async function mockApi(page: Page) {
  const state = {
    pacientes: [paciente],
    createdPacientePayload: null as PacientePayload | null,
    updatedPacientePayload: null as PacientePayload | null,
  };

  await page.route('https://date.nager.at/**', (route) => route.fulfill({ json: [] }));
  await page.route('http://localhost:5000/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/dashboard/summary') {
      return route.fulfill({
        json: {
          usersCount: 1,
          activeUsersCount: 1,
          pacientesCount: 1,
          activePatientsCount: 1,
          pendingPaymentsCount: 0,
          patientFilesCount: 0,
          upcomingEventsCount: 0,
        },
      });
    }

    if (path === '/api/dashboard/notifications') {
      return route.fulfill({ json: [] });
    }

    if (path === '/api/users/') {
      return route.fulfill({ json: paged([user]) });
    }

    if (path === '/api/pacientes/') {
      if (method === 'POST') {
        const payload = request.postDataJSON() as PacientePayload;
        const createdPaciente = buildPacienteFromPayload(11, payload);
        state.createdPacientePayload = payload;
        state.pacientes = [createdPaciente, ...state.pacientes];

        return route.fulfill({ json: createdPaciente });
      }

      return route.fulfill({ json: paged(state.pacientes) });
    }

    if (path === '/api/pacientes/10') {
      if (method === 'PUT') {
        const payload = request.postDataJSON() as PacientePayload;
        const updatedPaciente = buildPacienteFromPayload(10, payload);
        state.updatedPacientePayload = payload;
        state.pacientes = state.pacientes.map((item) => (item.id === 10 ? updatedPaciente : item));

        return route.fulfill({ json: updatedPaciente });
      }

      return route.fulfill({ json: state.pacientes.find((item) => item.id === 10) ?? paciente });
    }

    if (path === '/api/hospitais/') {
      return route.fulfill({ json: [{ id: 1, nome: 'Santa Clara - Mater Dei' }] });
    }

    if (path === '/api/convenios/') {
      return route.fulfill({ json: [{ idConvenio: 7, descricaoConvenio: 'Particular' }] });
    }

    if (path === '/api/cbhpm/') {
      return route.fulfill({ json: paged([cbhpmItem]) });
    }

    if (path === '/api/events/' || path === '/api/events/medical-users') {
      return route.fulfill({ json: [] });
    }

    return route.fulfill({ json: {} });
  });

  return state;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((storedSession) => {
    localStorage.setItem('hemodinks.session', JSON.stringify(storedSession));
  }, session);
});

test('navega pelos fluxos principais autenticados', async ({ page }) => {
  await mockApi(page);

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Painel inicial' })).toBeVisible();
  await expect(page.getByRole('button', { name: /abrir pacientes/i })).toBeVisible();

  await page.getByRole('button', { name: /abrir pacientes/i }).click();
  await expect(page).toHaveURL(/\/pacientes$/);
  await expect(page.getByRole('heading', { name: 'Pacientes' })).toBeVisible();
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();

  await page.goto('/agenda');
  await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
  await expect(page.getByText('Novo evento')).toBeVisible();
});

test('mantem telas criticas sem overflow horizontal no mobile', async ({ page }) => {
  await mockApi(page);

  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 860 });

    await page.goto('/agenda');
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible();
    await expect(page.locator('.agenda-calendar')).toBeVisible();
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).resolves.toBe(true);

    await page.goto('/pacientes');
    await expect(page.getByRole('heading', { name: 'Pacientes' })).toBeVisible();
    await expect(page.getByText('Paciente Hemodinks')).toBeVisible();
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).resolves.toBe(true);
  }
});

test('cadastra e edita paciente usando o fluxo real do formulario', async ({ page }) => {
  const apiState = await mockApi(page);

  await page.goto('/pacientes');
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();

  await page.getByRole('button', { name: 'Novo paciente' }).click();
  await expect(page.getByRole('heading', { name: 'Novo paciente' })).toBeVisible();
  await page.getByLabel('Paciente', { exact: true }).fill('Paciente Novo');
  await page.getByLabel('CPF').fill('52998224725');
  await page.getByLabel('Telefone').fill('81998765432');
  await page.getByLabel('Hospital').selectOption('1');
  await page.locator(`input[list="${'hemodinks-medical-users-options'}"]`).fill('Ana Hemodinks');
  await page.locator(`input[list="${'hemodinks-convenios-options'}"]`).fill('Particular');

  await page.getByRole('button', { name: 'Adicionar procedimento' }).click();
  await expect(page.getByRole('heading', { name: 'Selecionar procedimento' })).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(page.getByText('1.01.01.01-2')).toBeVisible();

  await page.getByRole('button', { name: 'Cadastrar paciente' }).click();
  await expect(page.getByText(/Paciente cadastrado/)).toBeVisible();
  await expect(page.getByText('Paciente Novo')).toBeVisible();
  expect(apiState.createdPacientePayload).toMatchObject({
    nomePaciente: 'Paciente Novo',
    cpf: '52998224725',
    telefone: '+5581998765432',
    hospitalId: 1,
    medicoUserId: 1,
    convenioId: 7,
    procedimento: 'Consulta',
  });

  await page.getByTitle('Editar').last().click();
  await expect(page.getByRole('heading', { name: 'Editar paciente' })).toBeVisible();
  await page.getByLabel('Paciente', { exact: true }).fill('Paciente Editado');
  await page.getByRole('button', { name: 'Salvar paciente' }).click();
  await expect(page.getByText('Paciente atualizado.')).toBeVisible();
  await expect(page.getByText('Paciente Editado')).toBeVisible();
  expect(apiState.updatedPacientePayload).toMatchObject({
    nomePaciente: 'Paciente Editado',
    cpf: '11144477735',
    procedimento: 'Consulta',
  });
});

test('exporta pacientes em XLSX', async ({ page }) => {
  await mockApi(page);

  await page.goto('/pacientes');
  await expect(page.getByText('Paciente Hemodinks')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar XLSX' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^pacientes-hemodinks-\d{4}-\d{2}-\d{2}\.xlsx$/);
});
