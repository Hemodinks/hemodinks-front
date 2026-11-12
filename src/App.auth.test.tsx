vi.mock('./services/sessionService', async (importOriginal) => ({ ...(await importOriginal<object>()), restoreSession: vi.fn().mockResolvedValue(null) }));
vi.mock('./services', async () => (await import('./test/appServicesMock')).createServicesMock());
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as api from './services';
import { restoreSession } from './services/sessionService';
import { basePaciente, baseUser, mockSession, paged, SESSION_KEY, toLoginResponse } from './test/appTestData';
import { openPatientsModule, openUsersModule, renderAuthenticatedApp } from './test/appTestUi';
import { createJwtToken, resetAppTestState } from './test/appTestSetup';

describe('App — login, sessão e troca de clínica', () => {
  beforeEach(resetAppTestState);

  it.each(['no-session', 'network-error'] as const)('keeps credentials editable during bootstrap and after %s', async outcome => {
    let finish!: (value: Awaited<ReturnType<typeof restoreSession>>) => void;
    let fail!: (reason: Error) => void;
    vi.mocked(restoreSession).mockReturnValueOnce(new Promise((resolve, reject) => { finish = resolve; fail = reject; }));
    render(<App />);
    const email = screen.getByLabelText('Email');
    const password = screen.getByLabelText('Senha');
    const submit = screen.getByRole('button', { name: 'Verificando sessão…' });
    fireEvent.change(email, { target: { value: 'person@example.com' } });
    fireEvent.change(password, { target: { value: 'ExamplePassword123!' } });
    expect(email).toBeEnabled();
    expect(password).toBeEnabled();
    expect(submit).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Verificando sessão');
    fireEvent.submit(email.closest('form')!);
    expect(api.resolveLoginClinics).not.toHaveBeenCalled();
    expect(api.authenticate).not.toHaveBeenCalled();
    expect(api.getPacientes).not.toHaveBeenCalled();
    expect(api.getDashboardSummary).not.toHaveBeenCalled();
    if (outcome === 'no-session') finish(null);
    else fail(new Error('Network unavailable'));
    await waitFor(() => expect(submit).toBeEnabled());
    expect(submit).toHaveAccessibleName('Entrar');
    expect(submit).toHaveAccessibleDescription('Você já pode clicar em Entrar.');
    expect(email).toHaveValue('person@example.com');
    expect(password).toHaveValue('ExamplePassword123!');
    expect(screen.queryByText(/Verificando sessão/)).not.toBeInTheDocument();
    expect(api.authenticate).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('enters the restored session without submitting credentials typed during bootstrap', async () => {
    let finish!: (value: Awaited<ReturnType<typeof restoreSession>>) => void;
    vi.mocked(restoreSession).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    render(<App />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'other@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'UnusedPassword123!' } });
    expect(api.getDashboardSummary).not.toHaveBeenCalled();
    finish(toLoginResponse(mockSession()));
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Acesso ao sistema' })).not.toBeInTheDocument();
    expect(api.resolveLoginClinics).not.toHaveBeenCalled();
    expect(api.authenticate).not.toHaveBeenCalled();
  });

  it('faz login, mantém a sessão em memória e carrega usuários', async () => {
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

    expect(await screen.findByText('GM Tech Solutions')).toBeInTheDocument();

    await user.type(await screen.findByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'SenhaAlterada@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(api.authenticate).toHaveBeenCalledWith('gmarcone@gmail.com', 'SenhaAlterada@123', 'hemodinks', expect.any(AbortSignal));
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/dashboard');
    const activeSession = screen.getByLabelText('Menu da clínica');
    expect(activeSession).toHaveTextContent('Clínica atual');
    await user.click(screen.getByRole('button', { name: 'Menu do usuário' }));
    expect(screen.getByLabelText('Dados da sessão')).toHaveTextContent('Administrador');
    expect(screen.getByLabelText('Dados da sessão')).toHaveTextContent('gmarcone@gmail.com');
    await user.keyboard('{Escape}');
    expect(screen.getByLabelText('Indicadores da clínica')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ações rápidas' })).toBeInTheDocument();
    expect(screen.getByText('Usuários ativos')).toBeInTheDocument();
    expect(screen.getByText('Pacientes ativos')).toBeInTheDocument();
    expect(screen.getByText('Pendências financeiras')).toBeInTheDocument();
    expect(screen.getByText('Arquivos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^usuários/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pacientes/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(api.getDashboardSummary).toHaveBeenCalledWith('jwt-token');
      expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', { page: 1, pageSize: 10, search: '', sortBy: 'data', sortDirection: 'desc' });
    });

    await user.click(screen.getByRole('button', { name: /^usuários/i }));
    expect(window.location.pathname).toBe('/usuarios');

    const userRow = (await screen.findByText('Ana Hemodinks', {}, { timeout: 5_000 })).closest('tr')!;
    expect(screen.getByAltText('Foto de Ana Hemodinks')).toBeInTheDocument();
    expect(screen.getByAltText('Foto de George Marcone')).toBeInTheDocument();
    expect(within(userRow).queryByText('+55 (81) 99999-9999')).not.toBeInTheDocument();
    expect(within(userRow).queryByText('529.982.247-25')).not.toBeInTheDocument();
    expect(api.getUsers).toHaveBeenCalledWith('jwt-token', { page: 1, pageSize: 10, search: '', sortBy: 'recent', sortDirection: 'desc' });

    await user.click(within(userRow).getByLabelText('Contato de Ana Hemodinks'));

    const contactDialog = screen.getByRole('dialog', { name: 'Ana Hemodinks' });
    expect(within(contactDialog).getByText('ana@hemodinks.com')).toBeInTheDocument();
    expect(within(contactDialog).getByText('+55 (81) 99999-9999')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Ana Hemodinks' })).not.toBeInTheDocument());

    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  }, 15_000);

  it('sempre inicia no login mesmo com uma sessao salva anteriormente', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(mockSession()));

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Email')).toBeEnabled();
    expect(screen.queryByLabelText('Clínica')).not.toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(api.getDashboardSummary).not.toHaveBeenCalled();
  });

  it('mostra o login após verificar a sessão sem consultar clínicas nem preparar a API', async () => {
    vi.mocked(api.listPublicClinics).mockReturnValue(new Promise(() => {}));
    render(<App />);

    expect(await screen.findByLabelText('Email')).toBeEnabled();
    expect(screen.getByLabelText('Senha')).toBeEnabled();
    expect(screen.queryByLabelText('Clínica')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Você já pode clicar em Entrar.');
    expect(api.resolveLoginClinics).not.toHaveBeenCalled();
    expect(api.listPublicClinics).not.toHaveBeenCalled();
    expect(api.authenticate).not.toHaveBeenCalled();
  });

  it('restaura a sessao validada pelo servidor ao recarregar a aplicacao', async () => {
    vi.mocked(restoreSession).mockResolvedValue(toLoginResponse(mockSession()));

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await waitFor(() => expect(api.getDashboardSummary).toHaveBeenCalledWith('jwt-token'));
    expect(api.authenticate).not.toHaveBeenCalled();
  });

  it('solicita a clínica após validar credenciais com múltiplos vínculos', async () => {
    const user = userEvent.setup();
    vi.mocked(api.resolveLoginClinics).mockResolvedValue({ clinicas: [
      { clinicaId: 1, nome: 'Clinica Alfa', slug: 'clinica-alfa' },
      { clinicaId: 2, nome: 'Clinica Beta', slug: 'clinica-beta' },
    ] });
    vi.mocked(api.authenticate).mockResolvedValue({
      id: 2,
      clinicaId: 2,
      clinicaSlug: 'clinica-beta',
      nome: 'George Beta',
      email: 'gmarcone@gmail.com',
      token: 'jwt-token',
      precisaTrocarSenha: false,
      perfilId: 1,
      perfilNome: 'Administrador',
    });

    render(<App />);
    expect(screen.queryByLabelText('Clínica')).not.toBeInTheDocument();
    await user.type(await screen.findByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'test-password');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('heading', { name: 'Escolha onde deseja entrar' })).toBeVisible();
    expect(api.resolveLoginClinics).toHaveBeenCalledWith('gmarcone@gmail.com', 'test-password', expect.any(AbortSignal));
    expect(api.authenticate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Clinica Beta' }));

    expect(api.authenticate).toHaveBeenCalledWith('gmarcone@gmail.com', 'test-password', 'clinica-beta', expect.any(AbortSignal));
  });

  it.each(['pacientes', 'usuários'])('descarta %s da clinica anterior enquanto a nova consulta esta pendente', async (module) => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: { perfilId: 5, perfilNome: 'SuperAdministrador' },
    });
    if (module === 'pacientes') await openPatientsModule(user);
    else await openUsersModule(user);
    const previousName = module === 'pacientes' ? basePaciente.nomePaciente : baseUser.nome;
    expect(await screen.findByText(previousName)).toBeInTheDocument();

    vi.mocked(api.listPlatformClinics).mockResolvedValue([{
      id: 2, nome: 'Clinica Beta', slug: 'beta', ativa: true, plano: 'Completa',
      assinaturaStatus: 'Ativa', modulosLiberados: [], dataCadastro: '2026-01-01',
    }]);
    vi.mocked(api.selectSessionClinic).mockResolvedValue({
      token: 'token-clinica-beta', usuarioGlobalId: 1,
      clinica: {
        clinicaId: 2, nome: 'Clinica Beta', slug: 'beta', userId: 101,
        perfilId: 5, perfil: 'SuperAdministrador', modulosLiberados: [],
        clinicaPadrao: false, usuarioClinicaId: 102,
      },
    });
    vi.mocked(api.getPacientes).mockImplementation((token) => token === 'token-clinica-beta'
      ? new Promise(() => {})
      : Promise.resolve(paged([basePaciente])));
    vi.mocked(api.getUsers).mockImplementation((token) => token === 'token-clinica-beta'
      ? new Promise(() => {})
      : Promise.resolve(paged([baseUser])));
    await user.click(within(screen.getByLabelText('Menu da clínica')).getByRole('button', { name: /^clínicas$/i }));
    expect(await screen.findByRole('heading', { name: 'Clínicas', level: 1 }, { timeout: 5000 })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Acessar Clinica Beta' }));
    if (module === 'pacientes') await openPatientsModule(user);
    else await openUsersModule(user);
    await waitFor(() => expect(module === 'pacientes' ? api.getPacientes : api.getUsers)
      .toHaveBeenCalledWith('token-clinica-beta', expect.anything()));
    expect(screen.queryByText(previousName)).not.toBeInTheDocument();
  });

  it('encerra a sessao quando a API sinaliza token expirado', async () => {
    await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();

    fireEvent(window, new Event(api.AUTH_EXPIRED_EVENT));

    expect(await screen.findByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    expect(screen.getByText('Sua sessao expirou. Entre novamente para continuar.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Painel inicial' })).not.toBeInTheDocument();
  });

  it('nao mantem uma sessao criada com token JWT expirado', async () => {
    const user = userEvent.setup();
    const expiredToken = createJwtToken({ exp: Math.floor(Date.now() / 1000) - 60 });
    vi.mocked(api.authenticate).mockResolvedValue({
      id: 99,
      nome: 'George Marcone',
      email: 'gmarcone@gmail.com',
      token: expiredToken,
      cpf: '00000000191',
      fotoPerfil: null,
      precisaTrocarSenha: false,
      perfilId: 1,
      perfilNome: 'Administrador',
    });

    render(<App />);

    await user.type(await screen.findByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'SenhaAlterada@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    expect(screen.getByText('Sua sessao expirou. Entre novamente para continuar.')).toBeInTheDocument();
  });

  it('mantém a marca do sistema antes de autenticar', async () => {
    render(<App />);

    expect(await screen.findByAltText('Hemodinks')).toHaveAttribute('src', '/imagem%20hemodinks%20github.jpg');
    expect(api.listPublicClinics).not.toHaveBeenCalled();
    expect(api.getSystemSettingsCompanyPhoto).not.toHaveBeenCalled();
  });

  it('permite visualizar e ocultar a senha no login', async () => {
    const user = userEvent.setup();

    render(<App />);

    const passwordInput = await screen.findByLabelText('Senha');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.type(passwordInput, 'test-password');
    await user.click(screen.getByRole('button', { name: /mostrar senha/i }));

    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /ocultar senha/i }));

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('mantém o login sem criar sessão quando a consulta de vínculos falha', async () => {
    const user = userEvent.setup();
    vi.mocked(api.resolveLoginClinics).mockRejectedValueOnce(new Error('Credenciais invalidas.'));
    render(<App />);

    await user.type(await screen.findByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-incorreta');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText('Credenciais invalidas.')).toBeVisible();
    expect(screen.getByLabelText('Senha')).toHaveValue('');
    expect(api.authenticate).not.toHaveBeenCalled();
    expect(api.listPublicClinics).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('não revela nem preenche a credencial temporária após o reset de contingência', async () => {
    const user = userEvent.setup();
    vi.mocked(api.resetPassword).mockResolvedValue({
      id: 99,
      precisaTrocarSenha: true,
      message: 'Nao foi possivel enviar o email de redefinicao agora. A senha padrao foi aplicada para voce entrar e trocar a seguir.',
      mode: 'default-password',
    });
    render(<App />);

    await user.type(await screen.findByLabelText('Email'), 'gmarcone@gmail.com');
    await user.click(screen.getByRole('button', { name: /esqueci minha senha/i }));

    await waitFor(() => {
      expect(api.resetPassword).toHaveBeenCalledWith('gmarcone@gmail.com', 'hemodinks');
    });

    expect(screen.getByLabelText('Senha')).toHaveValue('');
    expect(screen.getByText(/credencial temporária fornecida pela clínica/i)).toBeInTheDocument();
    expect(api.authenticate).not.toHaveBeenCalled();
  });

  it('mostra a instrucao de email quando o backend confirma o envio', async () => {
    const user = userEvent.setup();
    vi.mocked(api.resetPassword).mockResolvedValue({
      message: 'Enviamos um email com o link para redefinir sua senha. Use o link recebido para cadastrar uma nova senha.',
      mode: 'email-token',
    });

    render(<App />);

    await user.type(await screen.findByLabelText('Email'), 'gmarcone@gmail.com');
    await user.click(screen.getByRole('button', { name: /esqueci minha senha/i }));

    await waitFor(() => {
      expect(api.resetPassword).toHaveBeenCalledWith('gmarcone@gmail.com', 'hemodinks');
    });

    expect(screen.getByLabelText('Senha')).toHaveValue('');
    expect(screen.getByText(
      'Enviamos um email com o link para redefinir sua senha. Use o link recebido para cadastrar uma nova senha.',
    )).toBeInTheDocument();
  });

  it('mostra a tela publica de nova senha quando o link de reset possui token', async () => {
    const user = userEvent.setup();
    window.history.pushState(null, '', '/reset-password?token=token-123');
    vi.mocked(api.confirmPasswordReset).mockResolvedValue({
      id: 99,
      precisaTrocarSenha: false,
      message: 'Senha redefinida com sucesso',
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Redefinir senha' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Nova senha'), 'different-test-password');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'different-test-password');
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }));

    expect(api.confirmPasswordReset).toHaveBeenCalledWith('token-123', 'different-test-password');
    expect(await screen.findByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    expect(screen.getByText('Senha redefinida com sucesso. Entre com a nova senha.')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('permite voltar da tela publica de redefinicao para o login', async () => {
    const user = userEvent.setup();
    window.history.pushState(null, '', '/reset-password?token=token-123');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Redefinir senha' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /voltar ao login/i }));

    expect(await screen.findByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
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

    await user.type(await screen.findByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'temporary-test-password');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('heading', { name: 'Definir nova senha' })).toBeInTheDocument();
    expect(api.getUsers).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Senha atual'), 'temporary-test-password');
    await user.type(screen.getByLabelText('Nova senha'), 'different-test-password');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'different-test-password');
    await user.click(screen.getByRole('button', { name: /alterar senha/i }));

    expect(api.changePassword).toHaveBeenCalledWith(
      99,
      { senhaAtual: 'temporary-test-password', novaSenha: 'different-test-password' },
      'jwt-token',
    );
    expect(await screen.findByText('Senha alterada com sucesso')).toBeInTheDocument();
    // API #149 revokes sessions after a credential change, including first access.
    expect(screen.getByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    expect(api.getUsers).not.toHaveBeenCalled();
    vi.mocked(api.authenticate).mockResolvedValue(toLoginResponse(mockSession()));
    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'different-test-password');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^usuários/i }));

    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
  });
});
