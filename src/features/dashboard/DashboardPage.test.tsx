import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';

function renderDashboard(overrides: Partial<React.ComponentProps<typeof DashboardPage>> = {}) {
  const props: React.ComponentProps<typeof DashboardPage> = {
    companyName: 'Clínica Teste',
    canAccessPatients: false,
    canAccessUsers: false,
    canEditOwnUser: false,
    canAccessBilling: false,
    canAccessMedicalGroups: false,
    canAccessAgenda: false,
    canAccessSettings: false,
    canAccessClinics: false,
    patientReadOnly: false,
    usersCount: 0,
    pacientesCount: 0,
    activeUsersCount: 0,
    activePatientsCount: 0,
    pendingPaymentsCount: 0,
    patientFilesCount: 0,
    upcomingEventsCount: 0,
    unreadAgendaNotificationCount: 0,
    successMessage: '',
    dashboardError: '',
    onOpenUsersList: vi.fn(),
    onOpenMyProfile: vi.fn(),
    onOpenPatientsList: vi.fn(),
      onOpenBilling: vi.fn(),
      onOpenTutorials: vi.fn(),
    onOpenMedicalGroups: vi.fn(),
    onOpenAgenda: vi.fn(),
    onOpenSettings: vi.fn(),
    onOpenClinics: vi.fn(),
    ...overrides,
  };
  render(<DashboardPage {...props} />);
  return props;
}

describe('DashboardPage', () => {
  it('mostra somente indicadores e ações autorizados, sem duplicar todos os módulos', () => {
    renderDashboard({ userName: 'Ana Silva', canAccessUsers: true, canAccessBilling: true, canAccessClinics: true });
    expect(screen.getByRole('heading', { name: 'Olá, Ana' })).toBeVisible();
    expect(screen.getByText('Usuários ativos')).toBeVisible();
    expect(screen.queryByText('Pacientes ativos')).not.toBeInTheDocument();
    expect(screen.queryByText('Arquivos')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerenciar usuários' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Abrir clínicas' })).not.toBeInTheDocument();
  });
  it('abre uma pendência real e cria paciente somente quando autorizado', async () => {
    const onOpenBilling = vi.fn(); const onNewPatient = vi.fn();
    renderDashboard({ canAccessBilling: true, pendingPaymentsCount: 3, onOpenBilling,
      canAccessPatients: true, canCreatePatients: true, onNewPatient });
    await userEvent.click(screen.getByRole('button', { name: '3 pendência(s) de faturamento' }));
    expect(onOpenBilling).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Novo paciente' }));
    expect(onNewPatient).toHaveBeenCalledOnce();
  });
  it('não transforma carregamento ou falha em contagens zero ou ausência de pendências', () => {
    renderDashboard({ canAccessPatients: true, canAccessBilling: true, summaryAvailable: false });
    expect(screen.getAllByLabelText('Indicador indisponível')).toHaveLength(3);
    expect(screen.getByText(/Não foi possível consultar as pendências/)).toBeVisible();
    expect(screen.queryByText(/Nenhuma pendência/)).not.toBeInTheDocument();
  });
  it('mantém skeletons e ações utilizáveis durante o carregamento', () => {
    renderDashboard({ canAccessPatients: true, loading: true });
    expect(screen.getAllByLabelText('Carregando indicador')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Consultar pacientes' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Novo paciente' })).not.toBeInTheDocument();
  });
  it('exibe o estado vazio apenas após uma consulta válida', () => {
    renderDashboard({ canAccessBilling: true });
    expect(screen.getByText(/Nenhuma pendência/)).toBeVisible();
  });
});
