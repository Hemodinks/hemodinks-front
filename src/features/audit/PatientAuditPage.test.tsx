import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listAuditoria } from '../../services';
import { mockSession } from '../../test/appTestData';
import type { AuditoriaClinicaItem, PagedResult } from '../../types';
import { PatientAuditPage } from './PatientAuditPage';

vi.mock('../../services', () => ({ listAuditoria: vi.fn() }));

function page(items: AuditoriaClinicaItem[]): PagedResult<AuditoriaClinicaItem> {
  return { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 };
}

const inativacao: AuditoriaClinicaItem = {
  id: 1, dataUtc: '2026-11-25T12:00:00Z', usuarioId: 7, equipeOperadorId: null, usuarioNome: 'George', acao: 'paciente.inativar',
  recurso: 'paciente', recursoId: '10', statusCode: 204, sucesso: true, ipTruncado: '203.0.113.0',
  pacienteId: 10, pacienteNome: 'Paciente Hemodinks', detalhe: JSON.stringify({ motivo: 'Paciente transferido' }),
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>
    <PatientAuditPage session={mockSession()} medicalUsers={[]} convenios={[]} />
  </QueryClientProvider>);
}

describe('tela geral de auditoria de pacientes', () => {
  beforeEach(() => vi.mocked(listAuditoria).mockReset().mockResolvedValue(page([inativacao])));

  it('começa só com alterações e mostra paciente, ação e motivo', async () => {
    renderPage();
    const table = await screen.findByRole('table', { name: 'Auditoria de pacientes' });
    expect(listAuditoria).toHaveBeenCalledWith(mockSession().token, 1, 20, { somenteAlteracoes: true });
    const row = within(table).getAllByRole('row')[1];
    expect(within(row).getByText('Paciente Hemodinks')).toBeInTheDocument();
    expect(within(row).getByText('Inativou o paciente')).toBeInTheDocument();
    expect(within(row).getByText('Paciente transferido')).toBeInTheDocument();
    // Situação do cadastro não se aplica: a auditoria cobre ativos e inativos.
    expect(screen.queryByLabelText('Situação do cadastro')).not.toBeInTheDocument();
  });

  it('envia ação, paciente e "todas as ações" conforme os filtros', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('table', { name: 'Auditoria de pacientes' });

    await user.selectOptions(screen.getByLabelText('Ação'), 'paciente.reativar');
    await waitFor(() => expect(listAuditoria).toHaveBeenLastCalledWith(mockSession().token, 1, 20,
      { acao: 'paciente.reativar', somenteAlteracoes: true }));

    await user.type(screen.getByLabelText('Paciente'), 'Hemo');
    await waitFor(() => expect(listAuditoria).toHaveBeenLastCalledWith(mockSession().token, 1, 20,
      { search: 'Hemo', acao: 'paciente.reativar', somenteAlteracoes: true }));

    await user.click(screen.getByLabelText(/somente alterações/i));
    await waitFor(() => expect(listAuditoria).toHaveBeenLastCalledWith(mockSession().token, 1, 20,
      { search: 'Hemo', acao: 'paciente.reativar' }));
  });

  it('informa quando não há registros', async () => {
    vi.mocked(listAuditoria).mockResolvedValue(page([]));
    renderPage();
    expect(await screen.findByText('Nenhum registro encontrado para os filtros escolhidos.')).toBeInTheDocument();
  });
});
