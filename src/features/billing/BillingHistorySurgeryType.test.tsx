import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { basePaciente, mockSession } from '../../test/appTestData';
import type { Paciente } from '../../types';
import { BillingHistoryPage } from './BillingHistoryPage';
import { loadBillingPatients } from './billingPageUtils';

vi.mock('./billingPageUtils', async (original) => ({
  ...await original<typeof import('./billingPageUtils')>(), loadBillingPatients: vi.fn(),
}));
vi.mock('../../services', async (original) => ({
  ...await original<typeof import('../../services')>(), getBillingHistoryFiles: vi.fn(async () => []),
}));

function setup() {
  const patients: Paciente[] = [
    { ...basePaciente, id: 1, dataAtendimento: '2026-06-01', tipoCirurgia: 'Eletiva' },
    { ...basePaciente, id: 2, dataAtendimento: '2025-06-01', tipoCirurgia: 'Urgencia' },
    { ...basePaciente, id: 3, dataAtendimento: '2024-06-01', tipoCirurgia: 'Urgencia' },
  ];
  vi.mocked(loadBillingPatients).mockImplementation(async (_, filters) => patients.filter((patient) => !filters.tipoCirurgia || patient.tipoCirurgia === filters.tipoCirurgia));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><BillingHistoryPage
    session={mockSession()} medicalUsers={[]} convenios={[]} isAdmin isMedical={false} canManageFiles={false}
  /></QueryClientProvider>);
  return userEvent.setup();
}

describe('histórico ao filtrar tipo de cirurgia', () => {
  it('seleciona e expande o ano mais recente quando o filtro remove o ano atual', async () => {
    const user = setup();
    const picker = await screen.findByRole('group', { name: 'Ano exibido' });
    expect(within(picker).getByRole('button', { name: '2026' })).toHaveAttribute('aria-pressed', 'true');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo de cirurgia' }), 'Urgencia');
    await waitFor(() => expect(within(screen.getByRole('group', { name: 'Ano exibido' })).getByRole('button', { name: '2025' })).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByRole('button', { name: /^2025.*1 atendimento/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /^2024.*1 atendimento/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('preserva seleção e expansão quando o ano continua presente no filtro', async () => {
    const user = setup();
    await screen.findByRole('group', { name: 'Ano exibido' });
    await user.click(screen.getByRole('button', { name: /^2024.*1 atendimento/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo de cirurgia' }), 'Urgencia');
    await waitFor(() => expect(within(screen.getByRole('group', { name: 'Ano exibido' })).queryByRole('button', { name: '2026' })).not.toBeInTheDocument());
    expect(within(screen.getByRole('group', { name: 'Ano exibido' })).getByRole('button', { name: '2024' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^2024.*1 atendimento/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /^2025.*1 atendimento/ })).toHaveAttribute('aria-expanded', 'false');
  });
});
