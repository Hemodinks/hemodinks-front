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
  it('mantém a quantidade de cartões igual aos módulos autorizados', () => {
    renderDashboard({ canAccessUsers: true, canAccessBilling: true, canAccessClinics: true });

    expect(screen.getByRole('button', { name: 'Abrir usuários' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Abrir faturamento médico' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Abrir clínicas' })).toBeVisible();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('abre pelo cartão a mesma navegação usada pelo menu de clínicas', async () => {
    const onOpenClinics = vi.fn();
    renderDashboard({ canAccessClinics: true, onOpenClinics });

    await userEvent.click(screen.getByRole('button', { name: 'Abrir clínicas' }));

    expect(onOpenClinics).toHaveBeenCalledOnce();
  });
});
