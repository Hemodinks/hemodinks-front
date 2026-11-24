import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { basePaciente, mockSession } from '../../test/appTestData';
import { deleteBillingHistoryFile, getBillingHistoryFiles } from '../../services';
import { BillingHistoryPage } from './BillingHistoryPage';
import { loadBillingPatients } from './billingPageUtils';

vi.mock('./billingPageUtils', async (original) => ({
  ...await original<typeof import('./billingPageUtils')>(), loadBillingPatients: vi.fn(),
}));
vi.mock('../../services', async (original) => ({
  ...await original<typeof import('../../services')>(), getBillingHistoryFiles: vi.fn(), deleteBillingHistoryFile: vi.fn(),
}));

const file = { id: 7, ano: 2026, mes: 6, nomeOriginal: 'lote-junho.pdf', contentType: 'application/pdf', tamanhoBytes: 1024, dataUpload: '2026-07-01T12:00:00Z' };

async function setup() {
  vi.mocked(loadBillingPatients).mockResolvedValue([{ ...basePaciente, id: 1, dataAtendimento: '2026-06-01' }]);
  vi.mocked(getBillingHistoryFiles).mockResolvedValue([file]);
  vi.mocked(deleteBillingHistoryFile).mockResolvedValue(undefined);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><BillingHistoryPage
    session={mockSession()} medicalUsers={[]} convenios={[]} isAdmin isMedical={false} canManageFiles
  /></QueryClientProvider>);
  const user = userEvent.setup();
  const month = await screen.findByRole('button', { name: /^Junho/i });
  if (month.getAttribute('aria-expanded') === 'false') await user.click(month);
  return user;
}

// #311: exclusão confirmada no Modal do sistema (tema, foco e teclado), sem window.confirm.
describe('histórico: excluir arquivo do mês', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cancelar fecha o diálogo e não exclui', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const user = await setup();
    await user.click(await screen.findByRole('button', { name: 'Excluir lote-junho.pdf' }));

    const dialog = await screen.findByRole('dialog', { name: 'Excluir arquivo?' });
    expect(dialog).toHaveTextContent('lote-junho.pdf');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(deleteBillingHistoryFile).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('confirmar exclui o arquivo e mostra o sucesso', async () => {
    const user = await setup();
    await user.click(await screen.findByRole('button', { name: 'Excluir lote-junho.pdf' }));
    await screen.findByRole('dialog', { name: 'Excluir arquivo?' });
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(deleteBillingHistoryFile).toHaveBeenCalledWith(expect.any(String), 7));
    expect(await screen.findByText('Arquivo excluído com sucesso.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Escape fecha o diálogo sem excluir', async () => {
    const user = await setup();
    await user.click(await screen.findByRole('button', { name: 'Excluir lote-junho.pdf' }));
    await screen.findByRole('dialog', { name: 'Excluir arquivo?' });
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deleteBillingHistoryFile).not.toHaveBeenCalled();
  });
});
