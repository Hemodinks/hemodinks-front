import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
import { apiClient, AUTH_EXPIRED_EVENT } from '../../services/api';
import { mockSession } from '../../test/appTestData';
import { EmailChangeAction } from './EmailChangeAction';

const response = (data: unknown, status = 200) => ({ data, status, headers: {}, config: { headers: {} }, statusText: '' }) as AxiosResponse;
const fail = (code: string, status = 403) => new AxiosError('failed', undefined, undefined, undefined, response({ code, message: 'sensitive-canary' }, status));
const requestId = '12345678-1234-1234-1234-123456789012';
const started = () => response({ requestId, expiresAt: new Date(Date.now() + 600000).toISOString() });
const session = mockSession({ clinicaId: 1 });
const code = 'c'.repeat(64);
const password = 'sensitive-current-password';
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

function open() {
  fireEvent.change(screen.getByLabelText('Novo email de autenticação'), { target: { value: 'new@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar alteração de email' }));
  fireEvent.change(screen.getByLabelText('Senha atual da conta individual'), { target: { value: password } });
}
function send() { fireEvent.click(screen.getByRole('button', { name: 'Enviar confirmação' })); }
async function confirm() {
  fireEvent.change(await screen.findByLabelText('Código de confirmação'), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar email' }));
}

it('continua a operação, confirma posse antes de sucesso e nunca persiste senha ou código', async () => {
  const calls = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(started()).mockResolvedValueOnce(response({ code: 'identity_changed' }));
  const storage = vi.spyOn(Storage.prototype, 'setItem');
  const log = vi.spyOn(console, 'error');
  const changed = vi.fn();
  render(<EmailChangeAction session={session} onChanged={changed} />);
  open(); send();
  await screen.findByLabelText('Código de confirmação');
  expect(changed).not.toHaveBeenCalled();
  expect(screen.getByText(/O email ainda não foi alterado/)).toBeInTheDocument();
  expect(document.body.innerHTML).not.toContain(password);
  await confirm();
  await waitFor(() => expect(changed).toHaveBeenCalledOnce());
  expect(calls.mock.calls.map(([config]) => [config.url, config.data])).toEqual([
    ['/api/users/email/change', { senhaAtual: password, novoEmail: 'new@example.com' }],
    ['/api/users/email/change/confirm', { requestId, code }],
  ]);
  expect(storage).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled();
  expect(document.body.innerHTML).not.toContain(code);
});

it.each(['identity_revalidation_failed', 'individual_identity_required', 'email_change_unavailable', 'email_confirmation_unavailable', 'identity_change_conflict', 'invalid_new_email'])('trata %s com mensagem segura sem encerrar sessão', async code => {
  vi.spyOn(apiClient, 'request').mockRejectedValueOnce(fail(code, code === 'email_confirmation_unavailable' ? 503 : 403));
  const expired = vi.fn(); window.addEventListener(AUTH_EXPIRED_EVENT, expired);
  const changed = vi.fn(); render(<EmailChangeAction session={session} onChanged={changed} />);
  open(); send();
  expect(await screen.findByRole('alert')).not.toHaveTextContent('sensitive-canary');
  expect(screen.getByLabelText('Senha atual da conta individual')).toHaveValue('');
  expect(screen.getByLabelText('Senha atual da conta individual')).toHaveAttribute('aria-describedby', 'email-change-error');
  expect(changed).not.toHaveBeenCalled(); expect(expired).not.toHaveBeenCalled();
  window.removeEventListener(AUTH_EXPIRED_EVENT, expired);
});

it('cancela o pedido no backend e retorna ao formulário preservando só o email', async () => {
  const calls = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(started()).mockResolvedValueOnce(response(undefined, 204));
  render(<EmailChangeAction session={session} onChanged={vi.fn()} />); open(); send();
  await screen.findByLabelText('Código de confirmação');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Novo email de autenticação')).toHaveValue('new@example.com');
  expect(calls.mock.calls[1][0]).toMatchObject({ url: '/api/users/email/change/cancel', data: { requestId } });
  fireEvent.click(screen.getByRole('button', { name: 'Continuar alteração de email' }));
  expect(screen.getByLabelText('Senha atual da conta individual')).toHaveValue('');
});

it('expiração solicita nova credencial somente para a ação', async () => {
  vi.spyOn(apiClient, 'request').mockResolvedValueOnce(response({ requestId, expiresAt: new Date(Date.now() + 10000).toISOString() }));
  render(<EmailChangeAction session={session} onChanged={vi.fn()} />); open();
  vi.useFakeTimers();
  await act(async () => send());
  expect(screen.getByLabelText('Código de confirmação')).toBeInTheDocument();
  await act(async () => { vi.advanceTimersByTime(10001); });
  expect(screen.getByRole('alert')).toHaveTextContent('expirou');
  expect(screen.getByLabelText('Senha atual da conta individual')).toHaveValue('');
});

it('pedido já expirado solicita nova senha e preserva o email', async () => {
  vi.spyOn(apiClient, 'request').mockResolvedValueOnce(response({ requestId, expiresAt: new Date(Date.now() - 1).toISOString() }));
  render(<EmailChangeAction session={session} onChanged={vi.fn()} />); open(); send();
  expect(await screen.findByRole('alert')).toHaveTextContent('expirou');
  expect(screen.getByLabelText('Senha atual da conta individual')).toHaveValue('');
  expect(screen.getByLabelText('Novo email de autenticação')).toHaveValue('new@example.com');
});

it('prova consumida/rejeitada reinicia só a confirmação, sem replay automático', async () => {
  const calls = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(started()).mockRejectedValueOnce(fail('identity_revalidation_failed'));
  const changed = vi.fn(); render(<EmailChangeAction session={session} onChanged={changed} />); open(); send(); await confirm();
  expect(await screen.findByRole('alert')).not.toHaveTextContent('sensitive-canary');
  expect(screen.queryByLabelText('Código de confirmação')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Senha atual da conta individual')).toHaveValue('');
  expect(calls).toHaveBeenCalledTimes(2); expect(changed).not.toHaveBeenCalled();
});

it('sessão revogada usa o tratamento normal de 401 e não conclui alteração', async () => {
  vi.spyOn(apiClient, 'request').mockRejectedValueOnce(fail('session_reauthentication_required', 401));
  const expired = vi.fn(); window.addEventListener(AUTH_EXPIRED_EVENT, expired);
  const changed = vi.fn(); render(<EmailChangeAction session={session} onChanged={changed} />); open(); send();
  await waitFor(() => expect(expired).toHaveBeenCalledOnce());
  expect(changed).not.toHaveBeenCalled(); window.removeEventListener(AUTH_EXPIRED_EVENT, expired);
});

it('troca de clínica descarta o pedido e ignora confirmação tardia', async () => {
  let finish!: (value: AxiosResponse) => void;
  const calls = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(started()).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const changed = vi.fn(); const view = render(<EmailChangeAction session={session} onChanged={changed} />); open(); send(); await confirm();
  view.rerender(<EmailChangeAction session={{ ...session, user: { ...session.user, clinicaId: 2 } }} onChanged={changed} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Novo email de autenticação')).toHaveValue('');
  await act(async () => finish(response({ code: 'identity_changed' })));
  expect(changed).not.toHaveBeenCalled(); expect(calls).toHaveBeenCalledTimes(2);
});

it('cancela durante envio e invalida o pedido que chegar tarde sem reabrir modal', async () => {
  let finish!: (value: AxiosResponse) => void;
  const calls = vi.spyOn(apiClient, 'request').mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValueOnce(response(undefined, 204));
  const changed = vi.fn(); render(<EmailChangeAction session={session} onChanged={changed} />); open(); send();
  fireEvent.keyDown(document, { key: 'Escape' });
  await act(async () => finish(started()));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Novo email de autenticação')).toHaveValue('new@example.com');
  expect(calls.mock.calls[1][0]).toMatchObject({ url: '/api/users/email/change/cancel', data: { requestId } });
  expect(changed).not.toHaveBeenCalled();
});
