import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as api from './api';
import type { AuthSession, Paciente, User } from './types';

vi.mock('./api', () => ({
  authenticate: vi.fn(),
  getDashboardNotifications: vi.fn(),
  getDashboardSummary: vi.fn(),
  getUsers: vi.fn(),
  getPaciente: vi.fn(),
  getPacientes: vi.fn(),
  createUser: vi.fn(),
  createPaciente: vi.fn(),
  updatePaciente: vi.fn(),
  deletePaciente: vi.fn(),
  uploadPacienteArquivo: vi.fn(),
  deletePacienteArquivo: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  changePassword: vi.fn(),
  resetPassword: vi.fn(),
}));

const SESSION_KEY = 'hemodinks.session';

const baseUser: User = {
  id: 1,
  nome: 'Ana Hemodinks',
  email: 'ana@hemodinks.com',
  telefone: '+5581999999999',
  cpf: '52998224725',
  fotoPerfil: 'data:image/png;base64,ana',
  dataCadastro: '2026-06-01T00:00:00Z',
  dataNascimento: '1990-01-01T00:00:00Z',
  ativo: true,
  precisaTrocarSenha: false,
  perfilId: 2,
  perfilNome: 'Médicos',
};

const basePaciente: Paciente = {
  id: 10,
  userId: 20,
  data: '2026-06-01T00:00:00Z',
  nomePaciente: 'Paciente Hemodinks',
  hospital: 'Hospital Central',
  medico: 'Dra. Ana',
  convenio: 'Particular',
  procedimento: 'Consulta',
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

function paged<T>(items: T[], page = 1, pageSize = 10, totalItems = items.length) {
  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}

function mockSession(overrides?: Partial<AuthSession['user']>) {
  const session: AuthSession = {
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
      ...overrides,
    },
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

async function openUsersModule(user: ReturnType<typeof userEvent.setup>) {
  expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /abrir usuarios/i }));
}

async function openPatientsModule(user: ReturnType<typeof userEvent.setup>) {
  expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /abrir pacientes/i }));
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
    vi.clearAllMocks();
    vi.mocked(api.getDashboardSummary).mockResolvedValue({
      usersCount: 1,
      activeUsersCount: 1,
      pacientesCount: 1,
      activePatientsCount: 1,
      pendingPaymentsCount: 0,
      patientFilesCount: 0,
    });
    vi.mocked(api.getDashboardNotifications).mockResolvedValue([]);
    vi.mocked(api.getUsers).mockResolvedValue(paged([baseUser]));
    vi.mocked(api.getPaciente).mockResolvedValue(basePaciente);
    vi.mocked(api.getPacientes).mockResolvedValue(paged([basePaciente]));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('faz login, salva a sessao JWT e carrega usuarios', async () => {
    const user = userEvent.setup();
    vi.mocked(api.authenticate).mockResolvedValue({
      id: 99,
      nome: 'George Marcone',
      email: 'gmarcone@gmail.com',
      token: 'jwt-token',
      cpf: '00000000191',
      fotoPerfil: 'data:image/png;base64,george',
      precisaTrocarSenha: false,
      perfilId: 1,
      perfilNome: 'Administrador',
    });
    vi.mocked(api.resetPassword).mockResolvedValue({
      id: 99,
      precisaTrocarSenha: true,
      message: 'Senha resetada para a senha padrao',
    });

    render(<App />);

    expect(screen.getByText('GM Tech Solutions')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'SenhaAlterada@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(api.authenticate).toHaveBeenCalledWith('gmarcone@gmail.com', 'SenhaAlterada@123');
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(screen.getByText('Administrador | gmarcone@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('Painel informativo')).toBeInTheDocument();
    expect(screen.getByText('Resumo geral')).toBeInTheDocument();
    expect(screen.getByText('Usuarios ativos')).toBeInTheDocument();
    expect(screen.getByText('Pacientes ativos')).toBeInTheDocument();
    expect(screen.getByText('Pendencias')).toBeInTheDocument();
    expect(screen.getByText('Arquivos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir usuarios/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir pacientes/i })).toBeInTheDocument();
    expect(api.getDashboardSummary).toHaveBeenCalledWith('jwt-token');
    expect(api.getPacientes).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /abrir usuarios/i }));

    const userRow = (await screen.findByText('Ana Hemodinks')).closest('tr')!;
    expect(screen.getByAltText('Foto de Ana Hemodinks')).toBeInTheDocument();
    expect(screen.getByAltText('Foto de George Marcone')).toBeInTheDocument();
    expect(within(userRow).queryByText('+55 (81) 99999-9999')).not.toBeInTheDocument();
    expect(within(userRow).queryByText('529.982.247-25')).not.toBeInTheDocument();
    expect(api.getUsers).toHaveBeenCalledWith('jwt-token', { page: 1, pageSize: 10, search: '' });

    await user.click(within(userRow).getByLabelText('Contato de Ana Hemodinks'));

    const contactDialog = screen.getByRole('dialog', { name: 'Ana Hemodinks' });
    expect(within(contactDialog).getByText('ana@hemodinks.com')).toBeInTheDocument();
    expect(within(contactDialog).getByText('+55 (81) 99999-9999')).toBeInTheDocument();

    const storedSession = JSON.parse(localStorage.getItem(SESSION_KEY) ?? '{}') as AuthSession;
    expect(storedSession.token).toBe('jwt-token');
    expect(storedSession.user.precisaTrocarSenha).toBe(false);
    expect(storedSession.user.fotoPerfil).toBe('data:image/png;base64,george');
    expect(storedSession.user.perfilNome).toBe('Administrador');
  });

  it('alterna entre tema claro e escuro no painel logado', async () => {
    const user = userEvent.setup();
    mockSession();

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(document.documentElement).not.toHaveAttribute('data-theme');

    await user.click(screen.getByRole('button', { name: /tema escuro/i }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('hemodinks.theme')).toBe('dark');

    await user.click(screen.getByRole('button', { name: /tema claro/i }));

    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(localStorage.getItem('hemodinks.theme')).toBe('light');
  });

  it('abre as notificacoes do usuario logado', async () => {
    const user = userEvent.setup();
    mockSession();
    vi.mocked(api.getDashboardSummary).mockResolvedValue({
      usersCount: 1,
      activeUsersCount: 1,
      pacientesCount: 1,
      activePatientsCount: 1,
      pendingPaymentsCount: 1,
      patientFilesCount: 0,
    });
    vi.mocked(api.getDashboardNotifications).mockResolvedValue([
      {
        id: 10,
        tipo: 'PagamentoPendente',
        titulo: 'Pagamento pendente',
        mensagem: 'Paciente Paciente Hemodinks possui pagamento pendente.',
        pacienteId: 10,
        nomePaciente: 'Paciente Hemodinks',
        medico: 'Dra. Ana',
        procedimento: 'Consulta',
        data: '2026-06-01T00:00:00Z',
      },
    ]);

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /notificacoes/i }));

    expect(api.getDashboardNotifications).toHaveBeenCalledWith('jwt-token');

    const dialog = await screen.findByRole('dialog', { name: 'Notificacoes' });
    expect(within(dialog).getByText('1 pendencia encontrada')).toBeInTheDocument();
    expect(within(dialog).getByText('Pagamento pendente')).toBeInTheDocument();
    expect(within(dialog).getByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(within(dialog).getByText('Medico: Dra. Ana')).toBeInTheDocument();
    expect(within(dialog).getByText('Procedimento: Consulta')).toBeInTheDocument();
  });

  it('permite visualizar e ocultar a senha no login', async () => {
    const user = userEvent.setup();

    render(<App />);

    const passwordInput = screen.getByLabelText('Senha');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.type(passwordInput, 'Senha@123');
    await user.click(screen.getByRole('button', { name: /mostrar senha/i }));

    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /ocultar senha/i }));

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('reseta para a senha padrao e exige troca ao entrar', async () => {
    const user = userEvent.setup();
    vi.mocked(api.authenticate).mockResolvedValue({
      id: 99,
      nome: 'George Marcone',
      email: 'gmarcone@gmail.com',
      token: 'jwt-token',
      cpf: '00000000191',
      fotoPerfil: null,
      precisaTrocarSenha: false,
      perfilId: 1,
      perfilNome: 'Administrador',
    });

    render(<App />);

    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.click(screen.getByRole('button', { name: /esqueci minha senha/i }));

    await waitFor(() => {
      expect(api.resetPassword).toHaveBeenCalledWith('gmarcone@gmail.com');
    });

    expect(screen.getByLabelText('Senha')).toHaveValue('Senha@123');

    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(api.authenticate).toHaveBeenCalledWith('gmarcone@gmail.com', 'Senha@123');
    expect(await screen.findByRole('heading', { name: 'Troque sua senha' })).toBeInTheDocument();
    expect(api.getDashboardSummary).not.toHaveBeenCalled();
  });

  it('bloqueia o primeiro acesso ate a troca da senha padrao', async () => {
    const user = userEvent.setup();
    vi.mocked(api.authenticate).mockResolvedValue({
      id: 99,
      nome: 'George Marcone',
      email: 'gmarcone@gmail.com',
      token: 'jwt-token',
      cpf: '00000000191',
      fotoPerfil: null,
      precisaTrocarSenha: true,
      perfilId: 1,
      perfilNome: 'Administrador',
    });
    vi.mocked(api.changePassword).mockResolvedValue({
      id: 99,
      precisaTrocarSenha: false,
      message: 'Senha alterada com sucesso',
    });

    render(<App />);

    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('heading', { name: 'Troque sua senha' })).toBeInTheDocument();
    expect(api.getUsers).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Senha atual'), 'Senha@123');
    await user.type(screen.getByLabelText('Nova senha'), 'NovaSenha@123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'NovaSenha@123');
    await user.click(screen.getByRole('button', { name: /alterar senha/i }));

    expect(api.changePassword).toHaveBeenCalledWith(
      99,
      { senhaAtual: 'Senha@123', novaSenha: 'NovaSenha@123' },
      'jwt-token',
    );
    expect(await screen.findByText('Senha alterada com sucesso')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /abrir usuarios/i }));

    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
  });

  it('cadastra usuario com senha inicial padrao e recarrega a lista', async () => {
    const user = userEvent.setup();
    mockSession();
    vi.mocked(api.createUser).mockResolvedValue({
      ...baseUser,
      id: 2,
      nome: 'Bruno Hemodinks',
      email: 'bruno@hemodinks.com',
      telefone: '+5581888888888',
      cpf: '11144477735',
      fotoPerfil: null,
      dataNascimento: '1992-05-10T00:00:00Z',
      precisaTrocarSenha: true,
      perfilId: 2,
      perfilNome: 'Médicos',
    });

    render(<App />);

    await openUsersModule(user);
    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /novo usuario/i }));

    await user.type(screen.getByLabelText('Nome completo'), 'Bruno Hemodinks');
    await user.type(screen.getByLabelText('Email'), 'bruno@hemodinks.com');
    await user.type(screen.getByLabelText('Telefone'), '81988888888');
    await user.type(screen.getByLabelText('CPF'), '11144477735');
    await user.type(screen.getByLabelText('Data de nascimento'), '10051992');
    expect(screen.getByLabelText('Perfil')).toHaveValue('2');
    await user.click(screen.getByRole('button', { name: /cadastrar usuario/i }));

    expect(api.createUser).toHaveBeenCalledWith({
      nome: 'Bruno Hemodinks',
      email: 'bruno@hemodinks.com',
      telefone: '+5581988888888',
      cpf: '11144477735',
      fotoPerfil: null,
      dataNascimento: '1992-05-10',
      ativo: true,
      perfilId: 2,
    }, 'jwt-token');
    expect(await screen.findByText('Usuario cadastrado com senha inicial Senha@123.')).toBeInTheDocument();
    expect(api.getUsers).toHaveBeenCalledTimes(2);
  });

  it('permite anexar foto de perfil no cadastro', async () => {
    const user = userEvent.setup();
    mockSession();
    vi.mocked(api.createUser).mockResolvedValue({
      ...baseUser,
      id: 3,
      nome: 'Clara Hemodinks',
      email: 'clara@hemodinks.com',
      telefone: '+5581997777777',
      cpf: '93541134780',
      fotoPerfil: 'data:image/png;base64,YXZhdGFy',
      dataNascimento: '1991-03-12T00:00:00Z',
      precisaTrocarSenha: true,
    });

    render(<App />);

    await openUsersModule(user);
    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /novo usuario/i }));

    await user.type(screen.getByLabelText('Nome completo'), 'Clara Hemodinks');
    await user.type(screen.getByLabelText('Email'), 'clara@hemodinks.com');
    await user.type(screen.getByLabelText('Telefone'), '81997777777');
    await user.type(screen.getByLabelText('CPF'), '93541134780');
    await user.type(screen.getByLabelText('Data de nascimento'), '12031991');
    await user.upload(
      screen.getByLabelText('Foto do perfil'),
      new File(['avatar'], 'avatar.png', { type: 'image/png' }),
    );

    expect(await screen.findByAltText('Foto de Clara Hemodinks')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cadastrar usuario/i }));

    expect(api.createUser).toHaveBeenCalledWith({
      nome: 'Clara Hemodinks',
      email: 'clara@hemodinks.com',
      telefone: '+5581997777777',
      cpf: '93541134780',
      fotoPerfil: 'data:image/png;base64,YXZhdGFy',
      dataNascimento: '1991-03-12',
      ativo: true,
      perfilId: 2,
    }, 'jwt-token');
  });

  it('filtra usuarios pelo campo de busca', async () => {
    const user = userEvent.setup();
    mockSession();
    vi.mocked(api.getUsers)
      .mockResolvedValueOnce(paged([
      baseUser,
      {
        ...baseUser,
        id: 2,
        nome: 'Carlos Hemodinks',
        email: 'carlos@hemodinks.com',
        telefone: '+5581777777777',
      },
    ]))
      .mockResolvedValueOnce(paged([
        {
          ...baseUser,
          id: 2,
          nome: 'Carlos Hemodinks',
          email: 'carlos@hemodinks.com',
          telefone: '+5581777777777',
        },
      ]));

    render(<App />);

    await openUsersModule(user);
    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
    expect(screen.getByText('Carlos Hemodinks')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar'), 'carlos');

    await waitFor(() => {
      expect(api.getUsers).toHaveBeenCalledWith('jwt-token', { page: 1, pageSize: 10, search: 'carlos' });
    });

    expect(await screen.findByText('Carlos Hemodinks')).toBeInTheDocument();
    expect(screen.queryByText('Ana Hemodinks')).not.toBeInTheDocument();
  });

  it('lista e cadastra pacientes', async () => {
    const user = userEvent.setup();
    mockSession();
    vi.mocked(api.getUsers).mockResolvedValue(paged([baseUser]));
    vi.mocked(api.createPaciente).mockResolvedValue({
      ...basePaciente,
      id: 11,
      nomePaciente: 'Novo Paciente',
      email: 'novo.paciente@hemodinks.com',
      telefone: '+5581997777777',
      cpf: '93541134780',
      statusPago: false,
    });

    render(<App />);

    await openPatientsModule(user);

    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', { page: 1, pageSize: 10, search: '' });

    await user.click(screen.getByRole('button', { name: /novo paciente/i }));

    await user.type(screen.getByLabelText('Nome do paciente'), 'Novo Paciente');
    await user.type(screen.getByLabelText('CPF'), '93541134780');
    await user.type(screen.getByLabelText('Email'), 'novo.paciente@hemodinks.com');
    await user.type(screen.getByLabelText('Telefone'), '81997777777');
    expect(screen.queryByLabelText('Data')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Selecionar data de nascimento')).toHaveAttribute('type', 'date');
    await user.type(screen.getByLabelText('Data de nascimento'), '10051992');
    await user.type(screen.getByLabelText('Hospital'), 'Hospital Norte');
    expect(screen.getByRole('option', { name: 'Ana Hemodinks' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Medico'), 'Ana Hemodinks');
    await user.type(screen.getByLabelText('Procedimento'), 'Consulta');
    await user.click(screen.getByRole('button', { name: /cadastrar paciente/i }));

    expect(api.createPaciente).toHaveBeenCalledWith({
      data: null,
      nomePaciente: 'Novo Paciente',
      cpf: '93541134780',
      email: 'novo.paciente@hemodinks.com',
      telefone: '+5581997777777',
      fotoPerfil: null,
      dataNascimento: '1992-05-10',
      hospital: 'Hospital Norte',
      medico: 'Ana Hemodinks',
      convenio: '',
      procedimento: 'Consulta',
      autorizacao: '',
      pagamento: '',
      repasseGlosa: '',
      statusPago: false,
      ativo: true,
    }, 'jwt-token');
    expect(await screen.findByText('Paciente cadastrado com senha inicial Senha@123.')).toBeInTheDocument();
  });

  it('abre popup de informacoes, preenche o formulario ao editar e exclui usuario', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    mockSession();
    vi.mocked(api.updateUser).mockResolvedValue(baseUser);
    vi.mocked(api.deleteUser).mockResolvedValue(undefined);

    render(<App />);

    await openUsersModule(user);
    const row = await screen.findByText('Ana Hemodinks');
    const tableRow = row.closest('tr')!;

    await user.click(within(tableRow).getByLabelText('Detalhes de Ana Hemodinks'));

    const infoDialog = screen.getByRole('dialog', { name: 'Ana Hemodinks' });
    expect(infoDialog).toBeInTheDocument();
    expect(within(infoDialog).getByText('Data de nascimento')).toBeInTheDocument();
    expect(within(infoDialog).getByText('Perfil')).toBeInTheDocument();
    expect(within(infoDialog).getByText('Médicos')).toBeInTheDocument();
    expect(within(infoDialog).getByText('01/01/1990')).toBeInTheDocument();
    expect(within(infoDialog).getByText('Senha alterada')).toBeInTheDocument();
    expect(within(infoDialog).getByText('Ativo')).toBeInTheDocument();
    await user.click(within(infoDialog).getByRole('button', { name: /copiar cpf/i }));
    expect(writeText).toHaveBeenCalledWith('529.982.247-25');
    await user.click(screen.getByTitle('Fechar'));

    await user.click(within(tableRow).getByLabelText('Contato de Ana Hemodinks'));

    const contactDialog = screen.getByRole('dialog', { name: 'Ana Hemodinks' });
    expect(within(contactDialog).getByText('Email')).toBeInTheDocument();
    expect(within(contactDialog).getByText('Telefone')).toBeInTheDocument();
    expect(within(contactDialog).getByText('ana@hemodinks.com')).toBeInTheDocument();
    await user.click(within(contactDialog).getByRole('button', { name: /copiar email/i }));
    expect(writeText).toHaveBeenCalledWith('ana@hemodinks.com');
    await user.click(screen.getByTitle('Fechar'));

    await user.click(within(tableRow).getByTitle('Editar'));

    expect(screen.getByRole('heading', { name: 'Editar usuario' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Ana Hemodinks');
    expect(screen.getByLabelText('Telefone')).toHaveValue('+55 (81) 99999-9999');
    expect(screen.getByLabelText('CPF')).toHaveValue('529.982.247-25');
    expect(screen.getByLabelText('Data de nascimento')).toHaveValue('01/01/1990');
    expect(screen.getByLabelText('Perfil')).toHaveValue('2');

    await user.click(screen.getByTitle('Voltar para lista'));
    const deleteRow = (await screen.findByText('Ana Hemodinks')).closest('tr')!;
    await user.click(within(deleteRow).getByTitle('Excluir'));

    expect(window.confirm).toHaveBeenCalledWith('Excluir Ana Hemodinks?');
    expect(api.deleteUser).toHaveBeenCalledWith(1, 'jwt-token');
    expect(await screen.findByText('Usuario excluido.')).toBeInTheDocument();
  });

  it('pagina a lista com 10 registros por tela', async () => {
    const user = userEvent.setup();
    mockSession();
    const allUsers = Array.from({ length: 12 }, (_, index) => ({
      ...baseUser,
      id: index + 1,
      nome: `Usuario ${index + 1}`,
      email: `usuario${index + 1}@hemodinks.com`,
      telefone: '+5581999999999',
    }));
    vi.mocked(api.getUsers).mockReset();
    vi.mocked(api.getUsers)
      .mockResolvedValueOnce(paged(allUsers.slice(0, 10), 1, 10, 12))
      .mockResolvedValueOnce(paged(allUsers.slice(10), 2, 10, 12))
      .mockResolvedValue(paged(allUsers.slice(10), 2, 10, 12));

    render(<App />);

    await openUsersModule(user);
    expect(await screen.findByText('Usuario 1')).toBeInTheDocument();
    expect(screen.getByText('Usuario 10')).toBeInTheDocument();
    expect(screen.queryByText('Usuario 11')).not.toBeInTheDocument();
    expect(screen.getByText('1-10 de 12')).toBeInTheDocument();

    await user.click(screen.getByTitle('Proxima pagina'));

    expect(await screen.findByText('Usuario 11')).toBeInTheDocument();
    expect(screen.queryByText('Usuario 1')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('11-12 de 12')).toBeInTheDocument();
    });
  });

  it('alterna tema claro e escuro', async () => {
    const user = userEvent.setup();
    mockSession();

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /tema escuro/i }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByRole('button', { name: /tema claro/i })).toBeInTheDocument();
  });
});
