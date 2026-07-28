import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { buildEmptyForm } from './features/events/AgendaPage';
import * as api from './services';
import { CbhpmLookupModal } from './features/patients/CbhpmLookupModal';
import { queryClient } from './queryClient';
import type { AuthSession } from './shared/domain/sessionTypes';
import type { Paciente } from './shared/domain/clinicalContracts';
import type { PacienteObservacao } from './features/patients/patientTypes';
import type { User } from './features/users/userTypes';
import {
  basePaciente,
  baseUser,
  buildMedicalLicense,
  mockSession,
  paged,
  SESSION_KEY,
} from './test/appTestData';
import {
  getVisibleFirstColumnValues,
  openPatientsModule,
  openUsersModule,
  renderAuthenticatedApp,
} from './test/appTestUi';
import { createJwtToken, setupAppTest } from './test/appTestSetup';

vi.mock('./services', async () => {
  const { createAppServicesMock } = await import('./test/appServicesMock');
  return createAppServicesMock();
});

describe('App access and authentication', () => {
  beforeEach(setupAppTest);

  it('oculta configuracao para medico e bloqueia a rota direta', async () => {
    await renderAuthenticatedApp({
      initialPath: '/configuracoes',
      sessionOverrides: { perfilId: 2, perfilNome: 'Médicos' },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /abrir configuração do sistema/i }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
  });

  it('leva medico para o painel ao entrar mesmo quando a URL inicial e meu cadastro', async () => {
    await renderAuthenticatedApp({
      initialPath: '/meu-cadastro',
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
  });

  it('abre as notificacoes do usuario logado', async () => {
    vi.mocked(api.getDashboardSummary).mockResolvedValue({
      usersCount: 1,
      activeUsersCount: 1,
      pacientesCount: 1,
      activePatientsCount: 1,
      pendingPaymentsCount: 1,
      patientFilesCount: 0,
      upcomingEventsCount: 0,
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

    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /avisos/i }));

    expect(api.getDashboardNotifications).toHaveBeenCalledWith('jwt-token');

    const dialog = await screen.findByRole('dialog', { name: 'Notificações' });
    expect(within(dialog).getByText('1 aviso encontrado')).toBeInTheDocument();
    expect(within(dialog).getByText('Pagamento pendente')).toBeInTheDocument();
    expect(within(dialog).getByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(within(dialog).getByText('Médico: Dra. Ana')).toBeInTheDocument();
    expect(within(dialog).getByText('Procedimento: Consulta')).toBeInTheDocument();
  });

  it('destaca observacoes nao lidas na lista de pacientes e no modal', async () => {
    const pacienteComNaoLidas: Paciente = {
      ...basePaciente,
      observacoesNaoLidasCount: 3,
    };
    const observacoes: PacienteObservacao[] = [
      {
        id: 1,
        pacienteId: basePaciente.id,
        texto: 'Primeira observacao sem leitura.',
        dataCadastro: '2026-06-01T10:00:00Z',
        autorUserId: 1,
        autorNome: 'Dra. Ana',
        autorPerfilId: 2,
        autorPerfilNome: 'Médicos',
        destinatarioUserId: 99,
        destinatarioNome: 'George Marcone',
        destinatarioPerfilId: 1,
        destinatarioPerfilNome: 'Administrador',
        nomePaciente: basePaciente.nomePaciente,
        foiLida: false,
        enviadaPorMim: false,
      },
      {
        id: 2,
        pacienteId: basePaciente.id,
        texto: 'Resposta ja lida.',
        dataCadastro: '2026-06-01T11:00:00Z',
        autorUserId: 99,
        autorNome: 'George Marcone',
        autorPerfilId: 1,
        autorPerfilNome: 'Administrador',
        destinatarioUserId: 1,
        destinatarioNome: 'Dra. Ana',
        destinatarioPerfilId: 2,
        destinatarioPerfilNome: 'Médicos',
        nomePaciente: basePaciente.nomePaciente,
        foiLida: true,
        enviadaPorMim: true,
      },
    ];

    vi.mocked(api.getPacientes).mockResolvedValue(paged([pacienteComNaoLidas]));
    vi.mocked(api.getPaciente).mockResolvedValue(pacienteComNaoLidas);
    vi.mocked(api.getPacienteObservacoes).mockResolvedValue(observacoes);
    vi.mocked(api.markPacienteObservacoesAsRead).mockResolvedValue({
      pacienteId: basePaciente.id,
      updatedCount: 0,
    });

    const { user } = await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /abrir pacientes/i }));

    const patientRow = await screen.findByText('Paciente Hemodinks');
    const observationButton = within(patientRow.closest('tr')!).getByRole('button', {
      name: /observações de paciente hemodinks/i,
    });
    expect(within(observationButton).getByText('3')).toBeInTheDocument();
    expect(observationButton).toHaveClass('has-unread-observations');

    await user.click(observationButton);

    const dialog = await screen.findByRole('dialog', {
      name: 'Paciente Hemodinks',
    });
    expect(within(dialog).getByText('3 observações não lidas')).toBeInTheDocument();
    expect(within(dialog).getByText('Não lida')).toBeInTheDocument();
    expect(within(dialog).getByText('Lida')).toBeInTheDocument();
  });

  it('exibe hospital e destaque visual no popup de informacoes do paciente', async () => {
    vi.mocked(api.getPacientes).mockResolvedValue(paged([basePaciente]));
    vi.mocked(api.getPacienteFinanceiroResumo).mockResolvedValue({
      valorApresentado: 1000,
      valorGlosado: 100,
      valorReconhecido: 900,
      valorRecebido: 400,
      saldoAberto: 500,
      statusFinanceiro: 'Parcialmente recebido',
      origemDados: 'Normalizado',
      avisos: [],
    });

    const { user } = await renderAuthenticatedApp();

    await openPatientsModule(user);
    const row = await screen.findByText('Paciente Hemodinks');

    await user.click(
      within(row.closest('tr')!).getByRole('button', {
        name: /informações adicionais de paciente hemodinks/i,
      }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'Paciente Hemodinks',
    });
    expect(within(dialog).getByText('Hospital')).toBeInTheDocument();
    expect(within(dialog).getByText('Santa Clara - Mater Dei')).toBeInTheDocument();
    expect(within(dialog).getByText('Convênio')).toBeInTheDocument();
    expect(within(dialog).getByText('Particular')).toBeInTheDocument();
    expect(within(dialog).getByText('Procedimentos')).toBeInTheDocument();
    expect(within(dialog).getByText('Resumo financeiro')).toBeInTheDocument();
    expect(await within(dialog).findByText('Parcialmente recebido')).toBeInTheDocument();
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

  it('carrega foto de perfil pela API e exibe iniciais se a imagem falhar', async () => {
    await renderAuthenticatedApp({
      sessionOverrides: {
        nome: 'George Marcone',
        fotoPerfil: '/profile-photos/george.png',
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();

    await waitFor(() => {
      expect(api.getUserProfilePhoto).toHaveBeenCalledWith(99, 'jwt-token');
    });

    const avatar = await screen.findByAltText('Foto de George Marcone');
    expect(avatar).toHaveAttribute('src', 'blob:hemodinks-avatar');

    fireEvent.error(avatar);

    expect(screen.getByLabelText('Sem foto de George Marcone')).toBeInTheDocument();
  });

  it('carrega diretamente a foto publica da clinica', async () => {
    vi.mocked(api.listPublicClinics).mockResolvedValue([
      {
        id: 1,
        nome: 'Clinica Alfa',
        slug: 'clinica-alfa',
        fotoUrl: '/api/public/clinicas/clinica-alfa/foto',
      },
    ]);

    render(<App />);

    const brandMark = await screen.findByAltText('Clinica Alfa');
    await waitFor(() => {
      expect(brandMark).toHaveAttribute(
        'src',
        'http://localhost:5000/api/public/clinicas/clinica-alfa/foto',
      );
      expect(api.getSystemSettingsCompanyPhoto).not.toHaveBeenCalled();
    });
  });

  it('reseta para a senha padrao e exige troca ao entrar', async () => {
    const user = userEvent.setup();
    vi.mocked(api.resetPassword).mockResolvedValue({
      id: 99,
      precisaTrocarSenha: true,
      message:
        'Nao foi possivel enviar o email de redefinicao agora. A senha padrao foi aplicada para voce entrar e trocar a seguir.',
      mode: 'default-password',
    });
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
      expect(api.resetPassword).toHaveBeenCalledWith('gmarcone@gmail.com', 'hemodinks');
    });

    expect(screen.getByLabelText('Senha')).toHaveValue('Senha@123');

    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(api.authenticate).toHaveBeenCalledWith('gmarcone@gmail.com', 'Senha@123', 'hemodinks');
    expect(await screen.findByRole('heading', { name: 'Troque sua senha' })).toBeInTheDocument();
    expect(api.getDashboardSummary).not.toHaveBeenCalled();
  });

  it('mostra a instrucao de email quando o backend confirma o envio', async () => {
    const user = userEvent.setup();
    vi.mocked(api.resetPassword).mockResolvedValue({
      message:
        'Enviamos um email com o link para redefinir sua senha. Use o link recebido para cadastrar uma nova senha.',
      mode: 'email-token',
    });

    render(<App />);

    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.click(screen.getByRole('button', { name: /esqueci minha senha/i }));

    await waitFor(() => {
      expect(api.resetPassword).toHaveBeenCalledWith('gmarcone@gmail.com', 'hemodinks');
    });

    expect(screen.getByLabelText('Senha')).toHaveValue('');
    expect(
      screen.getByText(
        'Enviamos um email com o link para redefinir sua senha. Use o link recebido para cadastrar uma nova senha.',
      ),
    ).toBeInTheDocument();
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

    expect(screen.getByRole('heading', { name: 'Redefinir senha' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Nova senha'), 'NovaSenha@123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'NovaSenha@123');
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }));

    expect(api.confirmPasswordReset).toHaveBeenCalledWith('token-123', 'NovaSenha@123');
    expect(await screen.findByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    expect(
      screen.getByText('Senha redefinida com sucesso. Entre com a nova senha.'),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('permite voltar da tela publica de redefinicao para o login', async () => {
    const user = userEvent.setup();
    window.history.pushState(null, '', '/reset-password?token=token-123');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Redefinir senha' })).toBeInTheDocument();

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

    await user.click(screen.getByRole('button', { name: /abrir usuários/i }));

    expect(await screen.findByText('Ana Hemodinks')).toBeInTheDocument();
  });
});
