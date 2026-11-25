import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPacienteAuditoria } from '../../../services';
import type { AuditoriaClinicaItem, PagedResult } from '../../../types';
import { formatAuditDate, getAuditActionLabel, PatientAuditSection } from './PatientAuditSection';

vi.mock('../../../services', () => ({ getPacienteAuditoria: vi.fn() }));

function item(overrides: Partial<AuditoriaClinicaItem> = {}): AuditoriaClinicaItem {
  return {
    id: 1, dataUtc: '2026-11-23T15:00:00', usuarioId: 7, equipeOperadorId: null, usuarioNome: 'Dra. Ana',
    equipeOperadorNome: null, acao: 'paciente.ler', recurso: 'paciente', recursoId: '10', statusCode: 200,
    sucesso: true, ipTruncado: '203.0.113.0', ...overrides,
  };
}

function page(items: AuditoriaClinicaItem[], pageNumber = 1, totalItems = items.length): PagedResult<AuditoriaClinicaItem> {
  return { items, page: pageNumber, pageSize: 20, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / 20)) };
}

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><PatientAuditSection pacienteId={10} sessionToken="admin-token" /></QueryClientProvider>);
}

describe('trilha de auditoria do paciente', () => {
  beforeEach(() => vi.mocked(getPacienteAuditoria).mockReset());

  it('mostra o motivo da inativação e as alterações antes → depois, sem conteúdo de texto clínico', async () => {
    vi.mocked(getPacienteAuditoria).mockResolvedValue(page([
      item({ id: 5, acao: 'paciente.inativar', detalhe: JSON.stringify({ motivo: 'Paciente transferido' }) }),
      item({ id: 6, acao: 'paciente.editar', detalhe: JSON.stringify({ alteracoes: [
        { campo: 'Pago', de: 'Nao', para: 'Sim' },
        { campo: 'Status da cirurgia', de: 'NaoConsolidada', para: 'Consolidada' },
        { campo: 'Diagnostico', textoAlterado: true },
      ] }) }),
      item({ id: 7, acao: 'atendimento.cancelar', detalhe: '{json invalido' }),
    ]));
    renderSection();
    const table = await screen.findByRole('table', { name: 'Trilha de auditoria do paciente' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Paciente transferido')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Não')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Sim')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Não consolidada')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Diagnóstico:')).toBeInTheDocument();
    expect(within(rows[1]).getByText('alterado')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Cancelou atendimento')).toBeInTheDocument();
    expect(within(rows[2]).getByText('-', { selector: '.audit-detail-empty' })).toBeInTheDocument();
  });

  it('ao abrir mostra quem, ação, resultado e IP com rótulos amigáveis', async () => {
    vi.mocked(getPacienteAuditoria).mockResolvedValue(page([
      item(),
      item({ id: 2, acao: 'paciente.inativar', usuarioNome: null, usuarioId: 9, statusCode: 403, sucesso: false, ipTruncado: null }),
      item({ id: 3, acao: 'arquivo.baixar', equipeOperadorId: 4, equipeOperadorNome: 'Carla', usuarioNome: 'Equipe Centro' }),
    ]));
    renderSection();

    const table = await screen.findByRole('table', { name: 'Trilha de auditoria do paciente' });
    expect(getPacienteAuditoria).toHaveBeenCalledWith(10, 'admin-token', 1, 20);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Dra. Ana')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Visualizou o cadastro')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Sucesso')).toBeInTheDocument();
    expect(within(rows[0]).getByText('203.0.113.0')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Usuário #9')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Inativou o paciente')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Negado/erro (403)')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Equipe Centro (operador: Carla)')).toBeInTheDocument();
  });

  it('pagina a trilha e mostra estado vazio', async () => {
    vi.mocked(getPacienteAuditoria)
      .mockResolvedValueOnce(page([item()], 1, 25))
      .mockResolvedValueOnce(page([item({ id: 21, acao: 'arquivo.excluir' })], 2, 25));
    renderSection();
    expect(await screen.findByText('Página 1 de 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(await screen.findByText('Excluiu arquivo')).toBeInTheDocument();
    expect(getPacienteAuditoria).toHaveBeenLastCalledWith(10, 'admin-token', 2, 20);
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('informa quando não há registros e quando a consulta falha', async () => {
    vi.mocked(getPacienteAuditoria).mockResolvedValueOnce(page([]));
    const view = renderSection();
    expect(await screen.findByText('Nenhum registro de acesso para este paciente.')).toBeInTheDocument();
    view.unmount();

    vi.mocked(getPacienteAuditoria).mockRejectedValueOnce(new Error('Falha ao consultar a trilha'));
    renderSection();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('trata data sem fuso como UTC e mantém ação desconhecida legível', () => {
    expect(formatAuditDate('2026-11-23T15:00:00')).toBe(new Date('2026-11-23T15:00:00Z').toLocaleString('pt-BR'));
    expect(formatAuditDate('2026-11-23T15:00:00Z')).toBe(new Date('2026-11-23T15:00:00Z').toLocaleString('pt-BR'));
    expect(getAuditActionLabel('acao.nova')).toBe('acao.nova');
  });
});
