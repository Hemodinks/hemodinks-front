import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../queryClient';
import { activateMfa, beginMfaSetup, deactivateMfa, getMfaStatus } from '../../services/mfaService';
import { mockSession } from '../../test/appTestData';
import { clearIdentityNotice } from '../../shared/identityChange';
import { MFA_ENABLED_RELOGIN_MESSAGE, MfaSettingsPanel } from './MfaSettingsPanel';

vi.mock('../../services/mfaService', () => ({
  getMfaStatus: vi.fn(), beginMfaSetup: vi.fn(), activateMfa: vi.fn(), deactivateMfa: vi.fn(),
}));

const codes = ['AAAAA-BBBBB', 'CCCCC-DDDDD'];
const session = mockSession({ perfilId: 1 });

const renderPanel = (onIdentityChanged = vi.fn()) => ({
  onIdentityChanged,
  ...render(
    <QueryClientProvider client={queryClient}>
      <MfaSettingsPanel session={session} onIdentityChanged={onIdentityChanged} />
    </QueryClientProvider>,
  ),
});

async function enable() {
  fireEvent.click(await screen.findByRole('button', { name: 'Ativar' }));
  await screen.findByText('Abrir no aplicativo autenticador');
  fireEvent.change(screen.getByLabelText(/Código de 6 dígitos/), { target: { value: '123456' } });
  fireEvent.change(screen.getByLabelText(/Senha atual/), { target: { value: 'Senha@123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar e ativar' }));
}

describe('MfaSettingsPanel (#150)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queryClient.clear();
    clearIdentityNotice();
    vi.mocked(getMfaStatus).mockResolvedValue({ elegivel: true, habilitado: false, codigosRecuperacaoRestantes: 0 });
    vi.mocked(beginMfaSetup).mockResolvedValue({ segredo: 'JBSWY3DPEHPK3PXP', otpAuthUri: 'otpauth://totp/HemoDinks:a?secret=JBSWY3DPEHPK3PXP' });
  });

  it('is hidden when the account is not eligible', async () => {
    vi.mocked(getMfaStatus).mockResolvedValue({ elegivel: false, habilitado: false, codigosRecuperacaoRestantes: 0 });
    const { container } = renderPanel();
    await waitFor(() => expect(getMfaStatus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('enables with code and password, renews the session and keeps the codes across the remount', async () => {
    vi.mocked(activateMfa).mockResolvedValue({ codigosRecuperacao: codes, sessionRenewed: true });
    const first = renderPanel();
    await enable();

    await waitFor(() => expect(activateMfa).toHaveBeenCalledWith('Senha@123', '123456', session.token));
    expect(first.onIdentityChanged).toHaveBeenCalledWith('Verificação em duas etapas ativada.', { sessionRenewed: true, email: session.user.email });
    first.unmount();

    // A sessao nova remonta a area autenticada: os codigos continuam visiveis uma unica vez.
    renderPanel();
    expect(await screen.findByText(codes[0])).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Já guardei os códigos' }));
    expect(screen.queryByText(codes[0])).not.toBeInTheDocument();
  });

  it('asks for a new login only after the codes are saved when the session was not renewed', async () => {
    vi.mocked(activateMfa).mockResolvedValue({ codigosRecuperacao: codes, sessionRenewed: false });
    const { onIdentityChanged } = renderPanel();
    await enable();
    expect(await screen.findByText(codes[1])).toBeInTheDocument();
    expect(onIdentityChanged).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Já guardei os códigos' }));
    expect(onIdentityChanged).toHaveBeenCalledWith(MFA_ENABLED_RELOGIN_MESSAGE);
  });

  it('disables with password and code', async () => {
    vi.mocked(getMfaStatus).mockResolvedValue({ elegivel: true, habilitado: true, codigosRecuperacaoRestantes: 9 });
    vi.mocked(deactivateMfa).mockResolvedValue(undefined);
    renderPanel();
    expect(await screen.findByText(/restantes: 9/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Desativar' }));
    fireEvent.change(screen.getByLabelText(/Senha atual/), { target: { value: 'Senha@123' } });
    fireEvent.change(screen.getByLabelText(/Código do aplicativo/), { target: { value: 'AAAAA-BBBBB' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Desativar' }).at(-1)!);
    await waitFor(() => expect(deactivateMfa).toHaveBeenCalledWith('Senha@123', 'AAAAA-BBBBB', session.token));
  });
});
