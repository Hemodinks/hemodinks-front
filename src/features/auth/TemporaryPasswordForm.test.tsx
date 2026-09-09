import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PasswordForm } from '../../shared/components/PasswordForm';
import type { AuthSession } from '../../types';
import { completeTemporaryPassword } from '../../services/usersService';
import { normalizeTeamPinRequirement } from './useAuthSession';

vi.mock('../../services/usersService', () => ({ completeTemporaryPassword: vi.fn() }));
const session = { token: `e30.${btoa(JSON.stringify({ temporary_password: 'true', precisaTrocarSenha: 'true' }))}.signature`, user: { id: 7, perfilId: 2, precisaTrocarSenha: false } } as AuthSession;

describe('troca obrigatória', () => {
  it('restaura a restrição a partir do token', () => {
    expect(normalizeTeamPinRequirement(session).user.precisaTrocarSenha).toBe(true);
  });
  it('valida confirmação e encerra a sessão após salvar', async () => {
    vi.mocked(completeTemporaryPassword).mockResolvedValue({ message: 'Senha alterada' });
    const logout = vi.fn();
    const changed = vi.fn();
    render(<PasswordForm session={session} forced onChanged={changed} onCancel={logout} />);
    expect(screen.queryByLabelText('Senha atual')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'NovaSenha@123' } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'Diferente@123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
    expect(screen.getByText('A confirmacao precisa ser igual a nova senha.')).toBeInTheDocument();
    expect(completeTemporaryPassword).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'NovaSenha@123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    expect(changed).not.toHaveBeenCalled();
  });
});
