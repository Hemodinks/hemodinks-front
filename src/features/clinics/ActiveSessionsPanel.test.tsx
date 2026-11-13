import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../queryClient';
import { listPlatformActiveSessions } from '../../services';
import { mockSession } from '../../test/appTestData';
import type { PlatformActiveSessionsResponse } from '../../types/activeSessions';
import { ActiveSessionsPanel } from './ActiveSessionsPanel';

vi.mock('../../services', () => ({ listPlatformActiveSessions: vi.fn() }));

const response = (overrides: Partial<PlatformActiveSessionsResponse> = {}): PlatformActiveSessionsResponse => ({
  geradoEm: '2026-11-12T12:00:00Z',
  janelaOciosidadeMinutos: 30,
  usuariosOnline: 2,
  totalSessoes: 2,
  porClinica: [
    { clinicaId: 1, clinica: 'Clínica Alfa', usuarios: 1, sessoes: 1 },
    { clinicaId: 2, clinica: 'Clínica Beta', usuarios: 1, sessoes: 1 },
  ],
  pagina: 1,
  tamanhoPagina: 200,
  items: [
    { usuarioGlobalId: 10, nome: 'Ana Alfa', perfil: 'Administrador', clinicaId: 1, clinica: 'Clínica Alfa', viaEquipe: false,
      inicio: '2026-11-12T11:00:00Z', ultimaAtividade: '2026-11-12T11:58:00Z', navegador: 'Chrome · Windows' },
    { usuarioGlobalId: 20, nome: 'Bruno Beta', perfil: 'Equipe', clinicaId: 2, clinica: 'Clínica Beta', viaEquipe: true,
      inicio: '2026-11-12T10:00:00Z', ultimaAtividade: '2026-11-12T11:55:00Z', navegador: 'Safari · iOS' },
  ],
  ...overrides,
});

const renderPanel = (perfilId: number) => render(
  <QueryClientProvider client={queryClient}>
    <ActiveSessionsPanel session={mockSession({ perfilId })} />
  </QueryClientProvider>,
);

describe('ActiveSessionsPanel', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(listPlatformActiveSessions).mockReset();
  });

  it.each([1, 2, 3, 4, 6])('não renderiza nem chama a API para o perfil %s', (perfilId) => {
    const { container } = renderPanel(perfilId);

    expect(container).toBeEmptyDOMElement();
    expect(listPlatformActiveSessions).not.toHaveBeenCalled();
  });

  it('mostra totais, clínicas e sessões para o SuperAdministrador', async () => {
    vi.mocked(listPlatformActiveSessions).mockResolvedValue(response());
    renderPanel(5);

    expect(await screen.findByRole('heading', { name: '2 usuários online' })).toBeInTheDocument();
    expect(screen.getByText('Ana Alfa')).toBeInTheDocument();
    expect(screen.getByText('Bruno Beta')).toBeInTheDocument();
    expect(screen.getByText(/via equipe/)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Usuários online por clínica' })).toHaveTextContent('Clínica Beta');
    expect(listPlatformActiveSessions).toHaveBeenCalledWith(expect.any(String), 1, 200, expect.anything());
  });

  it('mostra estado vazio e permite atualizar', async () => {
    vi.mocked(listPlatformActiveSessions).mockResolvedValue(response({ usuariosOnline: 0, totalSessoes: 0, porClinica: [], items: [] }));
    renderPanel(5);

    expect(await screen.findByText('Nenhum usuário online agora.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar sessões ativas' }));
    await waitFor(() => expect(listPlatformActiveSessions).toHaveBeenCalledTimes(2));
  });

  it('mostra erro sem detalhes quando a API recusa', async () => {
    vi.mocked(listPlatformActiveSessions).mockRejectedValue(new Error('403'));
    renderPanel(5);

    expect(await screen.findByText('Não foi possível carregar as sessões ativas.')).toBeInTheDocument();
    expect(screen.queryByText('403')).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhum usuário online agora.')).not.toBeInTheDocument();
    expect(screen.getByText('Sessões indisponíveis.')).toBeInTheDocument();
  });

  it('avisa quando a lista exibida é menor que o total', async () => {
    vi.mocked(listPlatformActiveSessions).mockResolvedValue(response({ totalSessoes: 350 }));
    renderPanel(5);

    expect(await screen.findByText('Exibindo as 2 sessões mais recentes de 350.')).toBeInTheDocument();
  });
});
