import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { mockSession } from '../test/appTestData';
import { Sidebar } from './Sidebar';

function createProps(overrides: Partial<ComponentProps<typeof Sidebar>> = {}): ComponentProps<typeof Sidebar> {
  return {
    session: mockSession(),
    activeView: 'dashboard',
    currentUserProfile: 'Administrador',
    clinicName: 'Clínica Hemodinks',
    canAccessDashboard: true,
    canAccessPatients: true,
    canAccessUsers: true,
    canEditOwnUser: false,
    canAccessBilling: true,
    canAccessMedicalGroups: true,
    canAccessSettings: true,
    canAccessAgenda: true,
    canAccessClinics: false,
    usersCount: 3,
    pacientesCount: 5,
    medicalGroupsCount: 2,
    pendingPaymentsCount: 7,
    unreadAgendaNotificationCount: 1,
    onOpenDashboard: vi.fn(),
    onOpenUsersList: vi.fn(),
    onOpenMyProfile: vi.fn(),
    onOpenPatientsList: vi.fn(),
    onOpenBilling: vi.fn(),
    onOpenBillingHistory: vi.fn(),
    onOpenReports: vi.fn(),
    onOpenTutorials: vi.fn(),
    onOpenMedicalGroups: vi.fn(),
    onOpenAgenda: vi.fn(),
    onOpenSettings: vi.fn(),
    onOpenClinics: vi.fn(),
    ...overrides,
  };
}

describe('menu lateral de faturamento', () => {
  it('abre e fecha os submenus pelo botão principal e mantém o contador', async () => {
    const user = userEvent.setup();
    render(<Sidebar {...createProps()} />);

    const toggle = screen.getByRole('button', { name: /^Faturamento/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveTextContent('7');
    expect(screen.queryByRole('button', { name: 'Gestão de faturamento' })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: 'Opções de faturamento' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Gestão de faturamento' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Histórico' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Relatórios' })).toBeVisible();
    const reports = screen.getByRole('button', { name: 'Relatórios' });
    const history = screen.getByRole('button', { name: 'Histórico' });
    expect(reports.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('abre automaticamente e destaca o módulo e o submenu da rota atual', async () => {
    const onOpenReports = vi.fn();
    const { rerender } = render(<Sidebar {...createProps({ onOpenReports })} />);

    rerender(<Sidebar {...createProps({ activeView: 'reports', onOpenReports })} />);

    const toggle = screen.getByRole('button', { name: /^Faturamento/ });
    await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'true'));
    expect(toggle).toHaveClass('active');

    const reports = screen.getByRole('button', { name: 'Relatórios' });
    expect(reports).toHaveAttribute('aria-current', 'page');
    expect(reports).toHaveClass('active');

    await userEvent.click(reports);
    expect(onOpenReports).toHaveBeenCalledOnce();
  });

  it('aplica a mesma autorização da gestão de faturamento aos relatórios', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Sidebar {...createProps({ canAccessBilling: true })} />);

    await user.click(screen.getByRole('button', { name: /^Faturamento/ }));
    expect(screen.getByRole('button', { name: 'Gestão de faturamento' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Histórico' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Relatórios' })).toBeVisible();

    rerender(<Sidebar {...createProps({ canAccessBilling: false })} />);
    expect(screen.queryByRole('button', { name: /^Faturamento/ })).not.toBeInTheDocument();
  });
});

describe('menu de tutoriais interativos', () => {
  it('abre a biblioteca e identifica a rota ativa', async () => {
    const onOpenTutorials = vi.fn();
    render(<Sidebar {...createProps({ activeView: 'tutorials', onOpenTutorials })} />);

    const tutorials = screen.getByRole('button', { name: 'Tutoriais interativos' });
    expect(tutorials).toHaveAttribute('aria-current', 'page');
    await userEvent.click(tutorials);
    expect(onOpenTutorials).toHaveBeenCalledOnce();
  });
});

describe('menu lateral de pacientes', () => {
  it('administrador vê Pacientes - Cirurgias como accordion com Cadastro de Pacientes e Auditoria', async () => {
    const user = userEvent.setup();
    const onOpenPatientsList = vi.fn();
    const onOpenPatientAudit = vi.fn();
    render(<Sidebar {...createProps({ canAccessPatientAudit: true, onOpenPatientsList, onOpenPatientAudit })} />);

    const toggle = screen.getByRole('button', { name: /^pacientes - cirurgias/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(onOpenPatientsList).not.toHaveBeenCalled();

    const group = screen.getByRole('group', { name: 'Opções de pacientes' });
    const [cadastro, auditoria] = Array.from(group.querySelectorAll('button'));
    expect(cadastro).toHaveTextContent('Cadastro de Pacientes');
    expect(cadastro).toHaveTextContent('5');
    expect(auditoria).toHaveTextContent('Auditoria');
    await user.click(cadastro);
    await user.click(auditoria);
    expect(onOpenPatientsList).toHaveBeenCalledOnce();
    expect(onOpenPatientAudit).toHaveBeenCalledOnce();
  });

  it('abre o accordion na tela de auditoria e mantém botão simples para quem não vê a auditoria', () => {
    const { unmount } = render(<Sidebar {...createProps({ canAccessPatientAudit: true, activeView: 'patientAudit' })} />);
    expect(screen.getByRole('button', { name: /^pacientes - cirurgias/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Auditoria' })).toHaveAttribute('aria-current', 'page');
    unmount();

    render(<Sidebar {...createProps({ canAccessPatientAudit: false })} />);
    const patients = screen.getByRole('button', { name: /^pacientes - cirurgias/i });
    expect(patients).not.toHaveAttribute('aria-expanded');
    expect(screen.queryByRole('button', { name: 'Auditoria' })).not.toBeInTheDocument();
  });
});
