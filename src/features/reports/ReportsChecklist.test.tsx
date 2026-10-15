import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { basePaciente, mockSession } from '../../test/appTestData';
import { buildBillingRecords } from '../billing/billingUtils';
import { ReportsPage } from './ReportsPage';
import { loadReportData } from './reportData';

vi.mock('./reportData', () => ({ loadReportData: vi.fn() }));

const records = buildBillingRecords([{
  ...basePaciente, nomePaciente: 'Atendimento A', pagamento: '100,00',
  faturamento: { id: 1, pacienteId: basePaciente.id, dataCadastro: '2026-01-01', honorariosAuxiliares: 0, anestesistaFaturadoSeparado: true, conferenciaPagamentoRealizada: true },
}]);

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(loadReportData).mockResolvedValue({ records, teams: [], medicalGroups: [], unavailableCatalogs: [] });
  const session = mockSession();
  const view = render(<QueryClientProvider client={client}><ReportsPage session={session} companyName="Clínica A" isMedical={false} /></QueryClientProvider>);
  return { ...view, client, session, user: userEvent.setup() };
}

describe('motivos de checklist dos relatórios', () => {
  it('abre somente alertas reais do atendimento pago e separa a situação financeira', async () => {
    const { user } = setup();
    await user.click(await screen.findByRole('button', { name: /Itens pendentes do checklist de Atendimento A/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Pagamentos pendentes: 0')).toBeVisible();
    expect(dialog.querySelectorAll('.billing-checklist-row')).toHaveLength(5);
    expect(within(dialog).getAllByText(/Atenção|Pendente/, { selector: '.billing-flag' })).toHaveLength(5);
    expect(within(dialog).queryByText('Código TUSS/CBHPM/AMB')).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('não reabre seleção antiga quando sessão muda mesmo com mesmo id de atendimento', async () => {
    const { user, client, session, rerender } = setup();
    await user.click(await screen.findByRole('button', { name: /Itens pendentes do checklist de Atendimento A/i }));
    const otherSession = { ...session, token: 'clinic-b-token', user: { ...session.user, clinicaId: 2 } };
    rerender(<QueryClientProvider client={client}><ReportsPage session={otherSession} companyName="Clínica B" isMedical={false} /></QueryClientProvider>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('oferece Completo por padrão e permite selecionar Sintético antes da geração', async () => {
    const { user } = setup();
    await user.click(screen.getByText('Filtros', { selector: 'span' }));
    const select = screen.getByRole('combobox', { name: 'Formato do relatório' });
    expect(select).toHaveValue('complete');
    await user.selectOptions(select, 'synthetic');
    expect(select).toHaveValue('synthetic');
  });

  it('aplica filtros à lista global de motivos sem manter registros da consulta anterior', async () => {
    const { user } = setup();
    await user.click(await screen.findByRole('button', { name: /Atendimentos com checklist incompleto/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Atendimento A');
    await user.keyboard('{Escape}');
    await user.click(screen.getByText('Filtros', { selector: 'span' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'pending');
    await user.click(screen.getByRole('button', { name: 'Consultar' }));
    await user.click(screen.getByRole('button', { name: /Atendimentos com checklist incompleto/ }));
    expect(screen.getByRole('dialog')).not.toHaveTextContent('Atendimento A');
    expect(screen.getByRole('dialog')).toHaveTextContent('Nenhuma pendência encontrada');
  });
});
