import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../types';
import { TemporaryPasswordAction } from './TemporaryPasswordAction';
import * as service from '../../services/usersService';

vi.mock('../../services/usersService', () => ({ generateTemporaryPassword: vi.fn() }));
const user = { id: 7, nome: 'Maria', ativo: true, perfilId: 2 } as User;
afterEach(() => { vi.clearAllMocks(); });

describe('senha temporária', () => {
  it('oculta a ação sem autorização e para super administrador', () => {
    const { rerender } = render(<TemporaryPasswordAction user={user} token="token" canManage={false} isSuperAdmin={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<TemporaryPasswordAction user={{ ...user, perfilId: 5 }} token="token" canManage isSuperAdmin={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('confirma, exibe uma vez, copia e limpa ao fechar', async () => {
    vi.mocked(service.generateTemporaryPassword).mockResolvedValue({ id: 7, senhaTemporaria: 'SomenteNoDialog@123', expiresAtUtc: new Date(Date.now() + 300000).toISOString(), message: '' });
    const copy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: copy }, configurable: true });
    render(<TemporaryPasswordAction user={user} token="token" canManage isSuperAdmin={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar senha temporária para Maria' }));
    expect(service.generateTemporaryPassword).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Confirmar geração'));
    expect(await screen.findByDisplayValue('SomenteNoDialog@123')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Copiar senha'));
    await waitFor(() => expect(copy).toHaveBeenCalledWith('SomenteNoDialog@123'));
    fireEvent.click(screen.getByText('Fechar'));
    expect(screen.queryByDisplayValue('SomenteNoDialog@123')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar senha temporária para Maria' }));
    expect(screen.getByText('Confirmar geração')).toBeInTheDocument();
    expect(service.generateTemporaryPassword).toHaveBeenCalledTimes(1);
  });

  it('bloqueia cliques durante a chamada e apresenta erro', async () => {
    let reject!: (reason: Error) => void;
    vi.mocked(service.generateTemporaryPassword).mockReturnValue(new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
    render(<TemporaryPasswordAction user={user} token="token" canManage isSuperAdmin={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar senha temporária para Maria' }));
    fireEvent.click(screen.getByText('Confirmar geração'));
    expect(screen.getByText('Gerando...')).toBeDisabled();
    reject(new Error('Não foi possível gerar.'));
    expect(await screen.findByText('Não foi possível gerar.')).toBeInTheDocument();
    expect(service.generateTemporaryPassword).toHaveBeenCalledTimes(1);
  });
});
