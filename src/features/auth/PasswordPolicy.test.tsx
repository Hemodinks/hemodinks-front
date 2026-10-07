import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/api';
import { PasswordForm } from '../../shared/components/PasswordForm';
import { ResetPasswordScreen } from './ResetPasswordScreen';
import type { AuthSession } from '../../types';

const response = (data: unknown, status = 200) => ({ data, status, headers: {}, config: { headers: {} }, statusText: '' }) as AxiosResponse;
const failure = (code: string, status: number) => new AxiosError('Request failed', undefined, undefined, undefined, response({ code, message: 'Texto variável da API' }, status));
const session = { token: 'e30.e30.signature', user: { id: 7, perfilId: 2 } } as AuthSession;
const phrase = '  uma frase longa sem composicao obrigatoria  ';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe.each(['authenticated', 'first-access', 'temporary', 'reset'] as const)('política de senha: %s', (flow) => {
  it.each([['password_compromised', 400], ['password_policy_unavailable', 503]] as const)('associa %s e permite corrigir sem sair do formulário', async (code, status) => {
    const request = vi.spyOn(apiClient, 'request').mockRejectedValueOnce(failure(code, status)).mockResolvedValueOnce(response({ message: 'Senha alterada' }));
    const completed = vi.fn();
    const cancel = vi.fn();
    const temporarySession = { ...session, token: 'e30.' + btoa(JSON.stringify({ temporary_password: 'true' })) + '.signature' };
    if (flow === 'reset') render(<ResetPasswordScreen companyName="HemoDinks" theme="light" token="reset-token" onThemeToggle={vi.fn()} onBackToLogin={cancel} onResetCompleted={completed} />);
    else render(<PasswordForm session={flow === 'temporary' ? temporarySession : session} forced={flow !== 'authenticated'} onChanged={completed} onCancel={cancel} />);
    if (flow === 'authenticated' || flow === 'first-access') fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'credencial atual' } });
    const password = screen.getByLabelText('Nova senha');
    const confirmation = screen.getByLabelText('Confirmar nova senha');
    fireEvent.change(password, { target: { value: 'password' } });
    fireEvent.change(confirmation, { target: { value: 'password' } });
    const submit = screen.getByRole('button', { name: flow === 'reset' ? 'Redefinir senha' : 'Alterar senha' });
    fireEvent.click(submit);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(code === 'password_compromised' ? 'Escolha outra senha ou uma frase-senha' : 'Não foi possível verificar');
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(password.getAttribute('aria-describedby')!)).toContainElement(alert);
    expect(password).toHaveValue('password');
    expect(cancel).not.toHaveBeenCalled();
    expect(completed).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
    fireEvent.change(password, { target: { value: phrase } });
    expect(password).not.toHaveAttribute('aria-invalid');
    fireEvent.change(confirmation, { target: { value: phrase } });
    fireEvent.click(submit);
    await waitFor(() => expect(flow === 'temporary' ? cancel : completed).toHaveBeenCalledOnce());
    expect(request.mock.calls[1][0].data).toMatchObject({ novaSenha: phrase });
    expect(request.mock.calls[0][0].url).toBe(flow === 'reset' ? '/api/users/password/reset/confirm' : flow === 'temporary' ? '/api/users/password/temporary/complete' : '/api/users/7/password');
  });

  it('não classifica erros pelo texto', async () => {
    vi.spyOn(apiClient, 'request').mockRejectedValueOnce(new AxiosError('Request failed', undefined, undefined, undefined, response({ message: 'password_compromised' }, 400)));
    render(<PasswordForm session={session} onChanged={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'credencial atual' } });
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'password' } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Nova senha')).not.toHaveAttribute('aria-invalid');
  });
});
