import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuditoriaConfiguracao, updateAuditoriaConfiguracao } from '../../services';
import { mockSession } from '../../test/appTestData';
import { AuditSettingsPanel } from './AuditSettingsPanel';

vi.mock('../../services', () => ({ getAuditoriaConfiguracao: vi.fn(), updateAuditoriaConfiguracao: vi.fn() }));

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><AuditSettingsPanel session={mockSession()} /></QueryClientProvider>);
}

describe('configuração de auditoria de atendimentos', () => {
  beforeEach(() => {
    vi.mocked(getAuditoriaConfiguracao).mockReset().mockResolvedValue({ auditarAtendimentos: false });
    vi.mocked(updateAuditoriaConfiguracao).mockReset().mockResolvedValue({ auditarAtendimentos: true });
  });

  it('mostra o estado da clínica e liga a auditoria', async () => {
    const user = userEvent.setup();
    renderPanel();
    const toggle = await screen.findByRole('switch', { name: 'Auditar alterações de pacientes e atendimentos' });
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).not.toBeChecked();

    await user.click(toggle);
    expect(updateAuditoriaConfiguracao).toHaveBeenCalledWith(mockSession().token, { auditarAtendimentos: true });
    expect(await screen.findByText('Auditoria de atendimentos ativada para a clínica.')).toBeInTheDocument();
    expect(toggle).toBeChecked();
  });

  it('mostra o erro e não deixa alterar quando a configuração não carrega', async () => {
    vi.mocked(getAuditoriaConfiguracao).mockRejectedValue(new Error('Sem permissão'));
    renderPanel();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
