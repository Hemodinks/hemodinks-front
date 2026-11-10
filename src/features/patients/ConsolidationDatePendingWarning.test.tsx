import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../queryClient';
import { mockSession } from '../../test/appTestData';
import { queryKeys } from '../../shared/queryKeys';
import { getDataConsolidacaoPendencias } from '../../services';
import { ConsolidationDatePendingWarning } from './ConsolidationDatePendingWarning';

vi.mock('../../services', () => ({ getDataConsolidacaoPendencias: vi.fn() }));

const renderWarning = (session = mockSession(), onOpenPending = vi.fn()) => render(
  <QueryClientProvider client={queryClient}>
    <ConsolidationDatePendingWarning session={session} onOpenPending={onOpenPending} />
  </QueryClientProvider>,
);

describe('ConsolidationDatePendingWarning', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.mocked(getDataConsolidacaoPendencias).mockReset();
  });

  it.each([1, 2, 4, 5])('exibe aviso com o total e abre a lista filtrada para o perfil %s', async (perfilId) => {
    vi.mocked(getDataConsolidacaoPendencias).mockResolvedValue({ total: 4, anoMinimo: 2026, anoMaximo: 2027 });
    const onOpenPending = vi.fn();
    renderWarning(mockSession({ perfilId }), onOpenPending);

    expect(await screen.findByRole('status')).toHaveTextContent('4 cadastros com ano da data da consolidação inválido');
    expect(screen.getByRole('status')).toHaveTextContent('entre 2026 e 2027');
    expect(screen.getByRole('status')).toHaveTextContent('Pacientes - Cirurgias');
    fireEvent.click(screen.getByRole('button', { name: /ver pendências/i }));
    expect(onOpenPending).toHaveBeenCalledOnce();
  });

  it.each([3, 6])('não consulta nem exibe para o perfil %s', (perfilId) => {
    renderWarning(mockSession({ perfilId }));
    expect(getDataConsolidacaoPendencias).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('não exibe sem pendências e some quando a última pendência é corrigida', async () => {
    const session = mockSession();
    vi.mocked(getDataConsolidacaoPendencias).mockResolvedValue({ total: 1, anoMinimo: 2026, anoMaximo: 2027 });
    renderWarning(session);
    expect(await screen.findByRole('status')).toHaveTextContent('1 cadastro com ano');

    queryClient.setQueryData(queryKeys.pacientesPendenciasDataConsolidacao(session.token), { total: 0, anoMinimo: 2026, anoMaximo: 2027 });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('não exibe banner com resposta incompleta da API', async () => {
    vi.mocked(getDataConsolidacaoPendencias).mockResolvedValue({} as never);
    renderWarning();
    await waitFor(() => expect(getDataConsolidacaoPendencias).toHaveBeenCalled());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('não exibe nada quando a API recusa a consulta', async () => {
    vi.mocked(getDataConsolidacaoPendencias).mockRejectedValue(new Error('403'));
    renderWarning();
    await waitFor(() => expect(getDataConsolidacaoPendencias).toHaveBeenCalled());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
