vi.mock('./services/sessionService', async (importOriginal) => ({ ...(await importOriginal<object>()), restoreSession: vi.fn().mockResolvedValue(null) }));
vi.mock('./services', async () => (await import('./test/appServicesMock')).createServicesMock());
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './services';
import type { Paciente } from './types';
import { basePaciente, buildMedicalLicense } from './test/appTestData';
import { openPatientsModule, renderAuthenticatedApp } from './test/appTestUi';
import { resetAppTestState } from './test/appTestSetup';

describe('App — acesso a pacientes por perfil', () => {
  beforeEach(resetAppTestState);

  it('libera gestao de pacientes para medico com feature de gerenciamento', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
        licenca: buildMedicalLicense([
          'Dashboard.Visualizar',
          'Pacientes.Visualizar',
          'Pacientes.Gerenciar',
          'Cbhpm.Consultar',
        ]),
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^usuários/i })).not.toBeInTheDocument();
    expect(within(screen.getByLabelText('Menu da clínica')).getByRole('button', { name: /^meu cadastro$/i })).toBeInTheDocument();

    await openPatientsModule(user);
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /novo paciente/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Cirurgião')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Convênio')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Procedimento')).not.toBeInTheDocument();
    expect(api.getPacientes).toHaveBeenCalledWith('jwt-token', { page: 1, pageSize: 10, search: '', sortBy: 'data', sortDirection: 'desc' });
    expect(api.getScopedMedicalUsers).toHaveBeenCalledWith('jwt-token');

    await user.click(screen.getByRole('button', { name: /editar paciente hemodinks/i }));

    expect(await screen.findByRole('heading', { name: 'Editar paciente' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cirurgião')).toBeInTheDocument();
    expect(screen.getByLabelText('Médico auxiliar 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Médico auxiliar 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar alterações/i })).toBeInTheDocument();
  });

  it('carrega a licenca atual do medico quando ela nao vem no login e libera pacientes', async () => {
    vi.mocked(api.getCurrentLicenca).mockResolvedValue(buildMedicalLicense([
      'Dashboard.Visualizar',
      'Pacientes.Visualizar',
      'Pacientes.Gerenciar',
      'Cbhpm.Consultar',
    ]));

    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
        licenca: null,
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await waitFor(() => {
      expect(api.getCurrentLicenca).toHaveBeenCalledWith('jwt-token');
    });

    await openPatientsModule(user);
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /novo paciente/i })).toBeInTheDocument();
  });

  it('libera cadastro, edicao, arquivos e foto para medico mesmo sem feature de gerenciamento', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
        licenca: buildMedicalLicense(),
      },
    });

    await openPatientsModule(user);
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /novo paciente/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /novo paciente/i }));
    expect(await screen.findByRole('heading', { name: 'Novo paciente' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Convênio'), 'Convênio manual do médico');
    await user.type(screen.getByLabelText('Hospital'), 'Hospital manual do médico');
    expect(screen.getByLabelText('Convênio')).toHaveValue('Convênio manual do médico');
    expect(screen.getByLabelText('Hospital')).toHaveValue('Hospital manual do médico');
    await user.click(screen.getByRole('button', { name: /voltar para lista/i }));
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /editar paciente hemodinks/i }));

    expect(await screen.findByRole('heading', { name: 'Editar paciente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar alterações/i })).toBeInTheDocument();
    expect(screen.getByText('Selecionar arquivos')).toBeInTheDocument();
    expect(screen.queryByLabelText('Foto do paciente')).not.toBeInTheDocument();
  });

  it('exibe pacientes para medico mesmo sem feature explicita de pacientes na licenca', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
        licenca: buildMedicalLicense([
          'Dashboard.Visualizar',
          'Cbhpm.Consultar',
        ]),
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pacientes/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^usuários/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^opções$/i })).not.toBeInTheDocument();

    await openPatientsModule(user);
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /novo paciente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar paciente hemodinks/i })).toBeInTheDocument();
  });

  it('trata medico como licenca full para consultar CBHPM e cadastrar procedimento manual', async () => {
    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
        licenca: buildMedicalLicense([
          'Dashboard.Visualizar',
          'Pacientes.Visualizar',
          'Pacientes.Gerenciar',
        ]),
      },
    });

    await openPatientsModule(user);
    await user.click(screen.getByRole('button', { name: /novo paciente/i }));
    await user.click(screen.getByRole('button', { name: /adicionar procedimento/i }));

    const cbhpmDialog = await screen.findByRole('dialog', { name: 'Selecionar procedimento' });
    const consultButton = within(cbhpmDialog).getByRole('button', { name: /consultar procedimentos/i });

    expect(within(cbhpmDialog).queryByText(/sua licença não libera a consulta cbhpm/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(consultButton).toBeEnabled();
    });
    fireEvent.change(within(cbhpmDialog).getByLabelText('Procedimento'), {
      target: { value: 'Consulta' },
    });
    await user.click(consultButton);

    await waitFor(() => {
      expect(api.getCbhpmGeral).toHaveBeenCalledWith('jwt-token', expect.objectContaining({ procedimento: 'Consulta' }));
    });

    fireEvent.change(within(cbhpmDialog).getByLabelText('Procedimento'), {
      target: { value: 'Procedimento manual com licença full' },
    });
    await user.click(within(cbhpmDialog).getByRole('button', { name: /cadastrar manualmente/i }));

    expect(await screen.findByText('Procedimento manual com licença full')).toBeInTheDocument();
  });

  it('preserva medico fora da lista escopada ao editar e salvar paciente', async () => {
    vi.mocked(api.getPaciente).mockResolvedValue({
      ...basePaciente,
      medicoUserId: 55,
      medico: 'Dr. Fora da Lista',
      medicoAuxiliar1UserId: 2,
      medicoAuxiliar1: 'Bruno Hemodinks',
      medicoAuxiliar2UserId: null,
      medicoAuxiliar2: '',
    });
    vi.mocked(api.updatePaciente).mockResolvedValue({
      ...basePaciente,
      medicoUserId: 55,
      medico: 'Dr. Fora da Lista',
      medicoAuxiliar1UserId: 2,
      medicoAuxiliar1: 'Bruno Hemodinks',
      medicoAuxiliar2UserId: null,
      medicoAuxiliar2: '',
    });

    const { user } = await renderAuthenticatedApp({
      sessionOverrides: {
        perfilId: 2,
        perfilNome: 'Medicos',
        nome: 'Dra. Ana',
        licenca: buildMedicalLicense([
          'Dashboard.Visualizar',
          'Pacientes.Visualizar',
          'Pacientes.Gerenciar',
          'Cbhpm.Consultar',
        ]),
      },
    });

    await openPatientsModule(user);
    await user.click(screen.getByRole('button', { name: /editar paciente hemodinks/i }));

    expect(await screen.findByRole('heading', { name: 'Editar paciente' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cirurgião')).toHaveValue('Dr. Fora da Lista');
    expect(screen.getByLabelText('Status Pago')).toBeChecked();
    expect(screen.getByLabelText('Data do Pagamento')).toBeEnabled();
    expect(screen.getByLabelText('Data do Pagamento')).toHaveValue('');

    await user.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => {
      expect(api.updatePaciente).toHaveBeenCalledWith(10, expect.objectContaining({
        medicoUserId: 55,
        medico: 'Dr. Fora da Lista',
      }), 'jwt-token');
    });
  });

  it('abre painel para controller e permite cadastrar, editar e anexar arquivos de pacientes sem foto', async () => {
    const { user } = await renderAuthenticatedApp({
      initialPath: '/dashboard',
      sessionOverrides: {
        perfilId: 4,
        perfilNome: 'Controller',
      },
    });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
    expect(screen.queryByRole('button', { name: /^usuários/i })).not.toBeInTheDocument();
    expect(api.getDashboardSummary).toHaveBeenCalledWith('jwt-token');

    await user.click(screen.getByRole('button', { name: /^pacientes/i }));
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /novo paciente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar planilha/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar paciente hemodinks/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir paciente hemodinks/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /novo paciente/i }));
    expect(await screen.findByRole('heading', { name: 'Novo paciente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cadastrar paciente/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Foto do paciente')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /voltar para lista/i }));
    expect(await screen.findByText('Paciente Hemodinks')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /editar paciente hemodinks/i }));
    expect(await screen.findByRole('heading', { name: 'Editar paciente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar alterações/i })).toBeInTheDocument();
    expect(screen.getByText('Selecionar arquivos')).toBeInTheDocument();
    expect(screen.queryByLabelText('Foto do paciente')).not.toBeInTheDocument();
  });
});
