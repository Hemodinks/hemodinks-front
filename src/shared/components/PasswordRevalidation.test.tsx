import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
import { apiClient, AUTH_EXPIRED_EVENT } from '../../services/api';
import { mockSession } from '../../test/appTestData';
import { PasswordForm } from './PasswordForm';
const response = (data: unknown, status = 200) => ({ data, status, headers: {}, config: { headers: {} }, statusText: '' }) as AxiosResponse;
afterEach(() => vi.restoreAllMocks());

it.each(['identity_revalidation_failed', 'individual_identity_required'])('senha: %s limpa credenciais sem confirmação redundante nem logout', async code => {
  const request = vi.spyOn(apiClient, 'request').mockRejectedValueOnce(new AxiosError('failed', undefined, undefined, undefined, response({ code, message: 'sensitive-canary' }, 403)));
  const expired = vi.fn(); window.addEventListener(AUTH_EXPIRED_EVENT, expired);
  const changed = vi.fn(); render(<PasswordForm session={mockSession()} onChanged={changed} />);
  fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'current-secret' } });
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'long new phrase' } });
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'long new phrase' } });
  fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
  expect(await screen.findByRole('alert')).not.toHaveTextContent('sensitive-canary');
  for (const label of ['Senha atual', 'Nova senha', 'Confirmar nova senha']) expect(screen.getByLabelText(label)).toHaveValue('');
  expect(screen.getByLabelText('Senha atual')).toHaveAttribute('aria-invalid', 'true');
  expect(request).toHaveBeenCalledTimes(1); expect(expired).not.toHaveBeenCalled(); expect(changed).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  window.removeEventListener(AUTH_EXPIRED_EVENT, expired);
});

it('senha: sucesso chama encerramento com as credenciais limpas e uma única operação', async () => {
  const request = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(response({ message: 'Senha alterada. Entre novamente.' }));
  const changed = vi.fn(); render(<PasswordForm session={mockSession()} onChanged={changed} />);
  fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'current-secret' } });
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'long new phrase' } });
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'long new phrase' } });
  fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
  await waitFor(() => expect(changed).toHaveBeenCalledOnce()); expect(request).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Nova senha')).toHaveValue('');
});
