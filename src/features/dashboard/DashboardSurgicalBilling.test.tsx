import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardSurgicalBilling } from '../../types';
import { DashboardPage } from './DashboardPage';
import { toSurgicalBilling } from './surgicalBilling';

const mensal = Array.from({ length: 12 }, (_, index) => ({
  ano: index < 1 ? 2025 : 2026, mes: ((index + 11) % 12) + 1, cirurgias: index === 11 ? 3 : 1,
  faturado: index === 11 ? 18955.31 : 1000, recebido: index === 11 ? 9000 : 500,
}));
const surgical: DashboardSurgicalBilling = { naoConsolidadas: 27, aReceber: 65, valorAReceber: 104571.81, mensal };

function renderDashboard(overrides: Partial<React.ComponentProps<typeof DashboardPage>> = {}) {
  const props: React.ComponentProps<typeof DashboardPage> = {
    companyName: 'Clínica Teste', canAccessPatients: true, canAccessUsers: false, canEditOwnUser: false,
    canAccessBilling: true, canAccessMedicalGroups: false, canAccessAgenda: false, canAccessSettings: false,
    canAccessClinics: false, patientReadOnly: false, usersCount: 0, pacientesCount: 0, activeUsersCount: 0,
    activePatientsCount: 0, pendingPaymentsCount: 0, patientFilesCount: 0, upcomingEventsCount: 0,
    unreadAgendaNotificationCount: 0, successMessage: '', dashboardError: '',
    onOpenUsersList: vi.fn(), onOpenMyProfile: vi.fn(), onOpenPatientsList: vi.fn(), onOpenBilling: vi.fn(),
    onOpenBillingHistory: vi.fn(), onOpenTutorials: vi.fn(), onOpenMedicalGroups: vi.fn(), onOpenAgenda: vi.fn(),
    onOpenSettings: vi.fn(), onOpenClinics: vi.fn(),
    ...overrides,
  };
  render(<DashboardPage {...props} />);
  return props;
}

describe('Painel com indicadores do registro de cirurgia', () => {
  it('troca "Pendências financeiras" por cirurgias a receber e não consolidadas', () => {
    renderDashboard({ surgicalBilling: surgical });
    const stats = screen.getByLabelText('Indicadores da clínica');
    expect(within(stats).queryByText('Pendências financeiras')).not.toBeInTheDocument();
    expect(within(stats).getByText('Cirurgias a receber')).toBeInTheDocument();
    expect(within(stats).getByText('65')).toBeInTheDocument();
    expect(within(stats).getByText(/104\.571,81/)).toBeInTheDocument();
    expect(within(stats).getByText('Não consolidadas')).toBeInTheDocument();
    expect(within(stats).getByText('27')).toBeInTheDocument();
  });

  it('lista as pendências das cirurgias e leva ao módulo certo', async () => {
    const props = renderDashboard({ surgicalBilling: surgical });
    await userEvent.click(screen.getByRole('button', { name: /65 cirurgia\(s\) consolidada\(s\) a receber/ }));
    expect(props.onOpenBilling).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: /27 cirurgia\(s\) sem data de consolidação/ }));
    expect(props.onOpenPatientsList).toHaveBeenCalledTimes(1);
  });

  it('mostra o gráfico de 12 meses com legenda, rótulo acessível por mês e tabela', async () => {
    const props = renderDashboard({ surgicalBilling: surgical });
    expect(screen.getByRole('heading', { name: /Faturamento das cirurgias/ })).toBeInTheDocument();
    const legend = screen.getByRole('list', { name: 'Legenda' });
    expect(within(legend).getByText('Faturado')).toBeInTheDocument();
    expect(within(legend).getByText('Recebido')).toBeInTheDocument();
    const novembro = screen.getByRole('button', { name: /nov\/26: 3 cirurgia\(s\), faturado R\$\s18\.955,31, recebido R\$\s9\.000,00/ });
    await userEvent.hover(novembro);
    expect(screen.getByRole('status')).toHaveTextContent('nov/26');
    await userEvent.click(novembro);
    expect(props.onOpenBillingHistory).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('row')).toHaveLength(13);
  });

  it('mantém o indicador anterior quando a API não envia os dados das cirurgias', () => {
    renderDashboard({ surgicalBilling: null, pendingPaymentsCount: 4 });
    expect(screen.getByText('Pendências financeiras')).toBeInTheDocument();
    expect(screen.queryByText('Cirurgias a receber')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Faturamento das cirurgias/ })).not.toBeInTheDocument();
  });

  it('não mostra valores das cirurgias para quem não acessa o faturamento', () => {
    renderDashboard({ canAccessBilling: false, surgicalBilling: surgical });
    expect(screen.queryByText('Cirurgias a receber')).not.toBeInTheDocument();
    expect(screen.queryByText(/104\.571,81/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Faturamento das cirurgias/ })).not.toBeInTheDocument();
  });

  it('converte o resumo da API e ignora campos ausentes', () => {
    expect(toSurgicalBilling(null)).toBeNull();
    expect(toSurgicalBilling({ usersCount: 0, activeUsersCount: 0, pacientesCount: 0, activePatientsCount: 0,
      pendingPaymentsCount: 0, patientFilesCount: 0, upcomingEventsCount: 0 })).toBeNull();
    expect(toSurgicalBilling({ usersCount: 0, activeUsersCount: 0, pacientesCount: 0, activePatientsCount: 0,
      pendingPaymentsCount: 0, patientFilesCount: 0, upcomingEventsCount: 0,
      cirurgiasAReceberCount: 2, cirurgiasNaoConsolidadasCount: 1, valorAReceber: null, faturamentoMensal: null }))
      .toEqual({ aReceber: 2, naoConsolidadas: 1, valorAReceber: 0, mensal: [] });
  });
});
