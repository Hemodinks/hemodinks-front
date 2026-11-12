vi.mock('./services/sessionService', async (importOriginal) => ({ ...(await importOriginal<object>()), restoreSession: vi.fn().mockResolvedValue(null) }));
vi.mock('./services', async () => (await import('./test/appServicesMock')).createServicesMock());
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as api from './services';
import { restoreSession } from './services/sessionService';
import { ADMIN_PROFILE_ID, MEDICAL_PROFILE_ID, PATIENT_PROFILE_ID } from './shared/utils/formatterConstants';
import type { AuthSession } from './types';
import { basePaciente, baseUser, mockSession, toLoginResponse } from './test/appTestData';
import { resetAppTestState } from './test/appTestSetup';

// Simulates a reload (or a shared link opened in a signed-in browser): the server restores the session.
function reloadAt(path: string, overrides?: Partial<AuthSession['user']>) {
  window.history.pushState({}, '', path);
  vi.mocked(restoreSession).mockResolvedValue(toLoginResponse(mockSession(overrides)));
  render(<App />);
  return userEvent.setup();
}

const goBack = () => act(() => { window.history.back(); });
const goForward = () => act(() => { window.history.forward(); });

describe('App — formulários com rota própria', () => {
  beforeEach(resetAppTestState);

  it('recarregar /pacientes/<id> reabre a edição do mesmo paciente', async () => {
    reloadAt(`/pacientes/${basePaciente.id}`, { perfilId: ADMIN_PROFILE_ID });

    expect(await screen.findByRole('heading', { name: 'Editar paciente' })).toBeInTheDocument();
    expect(api.getPaciente).toHaveBeenCalledWith(basePaciente.id, 'jwt-token');
    expect(window.location.pathname).toBe(`/pacientes/${basePaciente.id}`);
  });

  it('recarregar /pacientes/novo reabre o cadastro vazio', async () => {
    reloadAt('/pacientes/novo', { perfilId: ADMIN_PROFILE_ID });

    expect(await screen.findByRole('heading', { name: 'Novo paciente' })).toBeInTheDocument();
    expect(api.getPaciente).not.toHaveBeenCalled();
  });

  it('editar pela lista muda a URL e voltar/avançar alternam lista e formulário', async () => {
    const user = reloadAt('/pacientes', { perfilId: ADMIN_PROFILE_ID });
    await user.click(await screen.findByRole('button', { name: `Editar ${basePaciente.nomePaciente}` }));

    expect(await screen.findByRole('heading', { name: 'Editar paciente' })).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/pacientes/${basePaciente.id}`);

    goBack();
    await waitFor(() => expect(window.location.pathname).toBe('/pacientes'));
    expect(await screen.findByRole('button', { name: `Editar ${basePaciente.nomePaciente}` })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Editar paciente' })).not.toBeInTheDocument();

    goForward();
    expect(await screen.findByRole('heading', { name: 'Editar paciente' })).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/pacientes/${basePaciente.id}`);
  });

  it('não abre cadastro novo por URL para perfil sem permissão de criar', async () => {
    reloadAt('/pacientes/novo', { perfilId: PATIENT_PROFILE_ID });

    await waitFor(() => expect(window.location.pathname).toBe('/pacientes'));
    expect(await screen.findByRole('heading', { name: 'Pacientes' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Novo paciente' })).not.toBeInTheDocument();
  });

  it('não abre cadastro de usuário por URL para quem não administra usuários', async () => {
    reloadAt('/usuarios/novo', { perfilId: 6, perfilNome: 'Equipe' });

    await waitFor(() => expect(window.location.pathname).toBe('/usuarios'));
    expect(screen.queryByRole('heading', { name: 'Novo usuário' })).not.toBeInTheDocument();
  });

  it('volta para a lista com erro quando o paciente da URL não pode ser carregado', async () => {
    vi.mocked(api.getPacientes).mockResolvedValue({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
    vi.mocked(api.getPaciente).mockRejectedValue(new Error('Paciente não encontrado.'));
    reloadAt('/pacientes/999', { perfilId: ADMIN_PROFILE_ID });

    await waitFor(() => expect(window.location.pathname).toBe('/pacientes'));
    expect(await screen.findByText('Paciente não encontrado.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Novo paciente' })).not.toBeInTheDocument();
  });

  it.each(['/pacientes/abc', '/pacientes/0', '/pacientes/10/extra', '/agenda/novo'])(
    'trata %s como rota desconhecida e volta ao painel',
    async (path) => {
      reloadAt(path, { perfilId: ADMIN_PROFILE_ID });

      expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
      expect(window.location.pathname).toBe('/dashboard');
      expect(api.getPaciente).not.toHaveBeenCalled();
    },
  );

  it('mantém o bloqueio do módulo nas sub-rotas: médico em /usuarios/<id> não carrega o usuário', async () => {
    reloadAt(`/usuarios/${baseUser.id}`, { perfilId: MEDICAL_PROFILE_ID });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/dashboard');
    expect(api.getUser).not.toHaveBeenCalled();
  });

  it('recarregar /usuarios/<id> reabre a edição do usuário', async () => {
    reloadAt(`/usuarios/${baseUser.id}`, { perfilId: ADMIN_PROFILE_ID });

    expect(await screen.findByRole('heading', { name: 'Editar usuário' })).toBeInTheDocument();
    expect(api.getUser).toHaveBeenCalledWith(baseUser.id, 'jwt-token');
  });

  it('resposta atrasada de um paciente anterior não sobrescreve o paciente da rota atual', async () => {
    let resolveFirst!: (value: typeof basePaciente) => void;
    vi.mocked(api.getPaciente).mockImplementation((id: number) => id === 10
      ? new Promise((resolve) => { resolveFirst = resolve; })
      : Promise.resolve({ ...basePaciente, id, nomePaciente: 'Paciente Atual' }));
    reloadAt('/pacientes/10', { perfilId: ADMIN_PROFILE_ID });
    await waitFor(() => expect(api.getPaciente).toHaveBeenCalledWith(10, 'jwt-token'));

    act(() => {
      window.history.pushState({}, '', '/pacientes/11');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() => expect(screen.getByLabelText('Paciente', { exact: true })).toHaveValue('Paciente Atual'));
    await act(async () => { resolveFirst({ ...basePaciente, id: 10, nomePaciente: 'Paciente Anterior' }); });

    expect(screen.getByLabelText('Paciente', { exact: true })).toHaveValue('Paciente Atual');
    expect(window.location.pathname).toBe('/pacientes/11');
  });

  it('volta para a lista de usuários com erro quando o usuário da URL não pode ser carregado', async () => {
    vi.mocked(api.getUsers).mockResolvedValue({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
    vi.mocked(api.getUser).mockRejectedValue(new Error('Usuário não encontrado.'));
    reloadAt('/usuarios/999', { perfilId: ADMIN_PROFILE_ID });

    await waitFor(() => expect(window.location.pathname).toBe('/usuarios'));
    expect(await screen.findByText('Usuário não encontrado.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Novo usuário' })).not.toBeInTheDocument();
  });

  it('volta para a lista de grupos com erro quando o grupo da URL não pode ser carregado', async () => {
    vi.mocked(api.getMedicalGroup).mockRejectedValue(new Error('Grupo não encontrado.'));
    reloadAt('/grupos-medicos/999', { perfilId: ADMIN_PROFILE_ID });

    await waitFor(() => expect(window.location.pathname).toBe('/grupos-medicos'));
    expect(await screen.findByText('Grupo não encontrado.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Novo grupo médico' })).not.toBeInTheDocument();
  });

  it('médico em /grupos-medicos/<id> não carrega o grupo', async () => {
    reloadAt('/grupos-medicos/1', { perfilId: MEDICAL_PROFILE_ID });

    expect(await screen.findByRole('heading', { name: 'Painel inicial' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/dashboard');
    expect(api.getMedicalGroup).not.toHaveBeenCalled();
  });

  it('recarregar /grupos-medicos/<id> reabre a edição do grupo', async () => {
    reloadAt('/grupos-medicos/1', { perfilId: ADMIN_PROFILE_ID });

    expect(await screen.findByRole('heading', { name: 'Editar grupo médico' })).toBeInTheDocument();
    expect(api.getMedicalGroup).toHaveBeenCalledWith(1, 'jwt-token');
  });
});
