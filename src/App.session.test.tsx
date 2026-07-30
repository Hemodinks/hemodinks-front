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

describe('App session and access', () => {
  beforeEach(setupAppTest);

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

    expect(api.authenticate).toHaveBeenCalledWith(
      'gmarcone@gmail.com',
      'SenhaAlterada@123',
      'hemodinks',
    );
    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/dashboard');
    expect(screen.getByText('Administrador | gmarcone@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('Painel informativo')).toBeInTheDocument();
    expect(screen.getByText('Resumo geral')).toBeInTheDocument();
    expect(screen.getByText('Usuários ativos')).toBeInTheDocument();
    expect(screen.getByText('Pacientes ativos')).toBeInTheDocument();
    expect(screen.getByText('Pendencias')).toBeInTheDocument();
    expect(screen.getByText('Arquivos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir usuários/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir pacientes/i })).toBeInTheDocument();
    expect(api.getDashboardSummary).toHaveBeenCalledWith('jwt-token');
    await waitFor(() => {
      expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', {
        page: 1,
        pageSize: 10,
        search: '',
        sortBy: 'recent',
        sortDirection: 'desc',
      });
    });

    await user.click(screen.getByRole('button', { name: /abrir usuários/i }));
    expect(window.location.pathname).toBe('/usuarios');

    const userRow = (await screen.findByText('Ana Hemodinks')).closest('tr')!;
    expect(screen.getByAltText('Foto de Ana Hemodinks')).toBeInTheDocument();
    expect(screen.getByAltText('Foto de George Marcone')).toBeInTheDocument();
    expect(within(userRow).queryByText('+55 (81) 99999-9999')).not.toBeInTheDocument();
    expect(within(userRow).queryByText('529.982.247-25')).not.toBeInTheDocument();
    expect(api.getUsers).toHaveBeenCalledWith('jwt-token', {
      page: 1,
      pageSize: 10,
      search: '',
      sortBy: 'recent',
      sortDirection: 'desc',
    });

    await user.click(within(userRow).getByLabelText('Contato de Ana Hemodinks'));

    const contactDialog = screen.getByRole('dialog', { name: 'Ana Hemodinks' });
    expect(within(contactDialog).getByText('ana@hemodinks.com')).toBeInTheDocument();
    expect(within(contactDialog).getByText('+55 (81) 99999-9999')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Ana Hemodinks' })).not.toBeInTheDocument(),
    );

    const storedSession = JSON.parse(localStorage.getItem(SESSION_KEY) ?? '{}') as AuthSession;
    expect(storedSession.token).toBeUndefined();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('sempre inicia no login mesmo com uma sessao salva anteriormente', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(mockSession()));

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Hemodinks')).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(api.getDashboardSummary).not.toHaveBeenCalled();
  });

  it('exige e envia a clinica escolhida no login pesquisavel', async () => {
    const user = userEvent.setup();
    vi.mocked(api.listPublicClinics).mockResolvedValue([
      { id: 1, nome: 'Clinica Alfa', slug: 'clinica-alfa', fotoUrl: null },
      { id: 2, nome: 'Clinica Beta', slug: 'clinica-beta', fotoUrl: null },
    ]);
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
    const clinicInput = await screen.findByLabelText('Clínica');
    await user.selectOptions(clinicInput, '2');
    expect(clinicInput).toHaveValue('2');
    expect(screen.queryByText('clinica-beta')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(api.authenticate).toHaveBeenCalledWith(
      'gmarcone@gmail.com',
      'Senha@123',
      'clinica-beta',
    );
  });

  it('libera menu administrativo completo e CRUD de clinicas para superadministrador', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: { perfilId: 5, perfilNome: 'SuperAdministrador' },
    });
    vi.mocked(api.listPlatformClinics).mockResolvedValue([]);

    const sidebar = screen.getByLabelText('Sessão ativa');
    expect(within(sidebar).getByRole('button', { name: /usuários/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /pacientes/i })).toBeInTheDocument();
    const controladoria = within(sidebar).getByRole('button', {
      name: /^controladoria$/i,
    });
    expect(controladoria).toHaveAttribute('aria-expanded', 'false');
    await user.click(controladoria);
    expect(controladoria).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(sidebar).getByRole('button', { name: /^atendimentos(?:: \d+)?$/i }),
    ).toBeInTheDocument();
    expect(
      within(sidebar).getByRole('button', { name: /^faturamento(?:: \d+)?$/i }),
    ).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /^financeiro$/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /grupos médicos/i })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /^clínicas$/i })).toBeInTheDocument();

    await user.click(within(sidebar).getByRole('button', { name: /^clínicas$/i }));
    expect(await screen.findByRole('heading', { name: 'Clínicas', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('0 clínicas cadastradas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /nova clínica/i }));
    const planSelect = screen.getByLabelText('Plano');
    expect(planSelect).toHaveValue('Trial');
    expect(within(planSelect).getByRole('option', { name: 'Completa' })).toBeInTheDocument();
    expect(screen.getByLabelText('Trial ate')).toBeInTheDocument();
    await user.selectOptions(planSelect, 'Completa');
    expect(screen.queryByLabelText('Trial ate')).not.toBeInTheDocument();
    await user.selectOptions(planSelect, 'Parcial');
    expect(screen.queryByLabelText('Trial ate')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Módulos contratados' })).toBeInTheDocument();
    expect(screen.getByLabelText('Pacientes')).toBeInTheDocument();

    const navigationButtons = within(
      within(sidebar).getByRole('navigation', { name: 'Navegação principal' }),
    ).getAllByRole('button');
    expect(navigationButtons.at(-1)).toHaveTextContent('Configuração');
  });

  it('oculta no menu e no dashboard os modulos nao contratados ate para superadministrador', async () => {
    await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 5,
        perfilNome: 'SuperAdministrador',
        modulosLiberados: ['pacientes'],
      },
    });

    const sidebar = screen.getByLabelText('Sessão ativa');
    expect(within(sidebar).getByRole('button', { name: /pacientes/i })).toBeInTheDocument();
    expect(within(sidebar).queryByRole('button', { name: /usuários/i })).not.toBeInTheDocument();
    expect(
      within(sidebar).queryByRole('button', { name: /faturamento médico/i }),
    ).not.toBeInTheDocument();
    expect(
      within(sidebar).queryByRole('button', { name: /agenda e notificações/i }),
    ).not.toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /^clínicas$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir pacientes/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /abrir usuários/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /abrir agenda/i })).not.toBeInTheDocument();
  });

  it('encerra a sessao quando a API sinaliza token expirado', async () => {
    await renderAuthenticatedApp();

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();

    fireEvent(window, new Event(api.AUTH_EXPIRED_EVENT));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    });
    expect(
      screen.getByText('Sua sessao expirou. Entre novamente para continuar.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Painel inicial' })).not.toBeInTheDocument();
  });

  it('nao mantem uma sessao criada com token JWT expirado', async () => {
    const user = userEvent.setup();
    const expiredToken = createJwtToken({
      exp: Math.floor(Date.now() / 1000) - 60,
    });
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

    await user.type(screen.getByLabelText('Email'), 'gmarcone@gmail.com');
    await user.type(screen.getByLabelText('Senha'), 'SenhaAlterada@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Acesso ao sistema' })).toBeInTheDocument();
    });
    expect(
      screen.getByText('Sua sessao expirou. Entre novamente para continuar.'),
    ).toBeInTheDocument();
  });

  it('nao exibe erro no dashboard quando o resumo retorna 403 para medico', async () => {
    vi.mocked(api.getDashboardSummary).mockRejectedValue(
      new Error('Request failed with status code 403'),
    );

    await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
        licenca: buildMedicalLicense(),
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await waitFor(() => {
      expect(api.getDashboardSummary).toHaveBeenCalledWith('jwt-token');
    });
    await waitFor(() => {
      expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', {
        page: 1,
        pageSize: 10,
        search: '',
        sortBy: 'recent',
        sortDirection: 'desc',
      });
    });
    expect(await screen.findByText('1 cadastrados')).toBeInTheDocument();
    expect(screen.queryByText(/request failed with status code 403/i)).not.toBeInTheDocument();
  });

  it('usa a foto publica da clinica selecionada na tela de login', async () => {
    vi.mocked(api.listPublicClinics).mockResolvedValue([
      {
        id: 1,
        nome: 'Clinica Alfa',
        slug: 'clinica-alfa',
        fotoUrl: '/api/public/clinicas/clinica-alfa/foto',
      },
    ]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByAltText('Clinica Alfa')).toHaveAttribute(
        'src',
        'http://localhost:5000/api/public/clinicas/clinica-alfa/foto',
      );
    });
  });
});
