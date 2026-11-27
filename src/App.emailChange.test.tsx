vi.mock('./services/sessionService', async (importOriginal) => ({ ...(await importOriginal<object>()), restoreSession: vi.fn().mockResolvedValue(null) }));
vi.mock('./services', async () => (await import('./test/appServicesMock')).createServicesMock());
import { act, screen, waitFor } from '@testing-library/react';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, AUTH_EXPIRED_EVENT } from './services/api';
import { restoreSession } from './services/sessionService';
import { mockSession, toLoginResponse } from './test/appTestData';
import { renderAuthenticatedApp } from './test/appTestUi';
import { resetAppTestState } from './test/appTestSetup';
import { clearIdentityNotice } from './shared/identityChange';
import { endSessionHandover } from './services/sessionHandover';

// Sob a suíte completa (CI) a renovação de sessão e a troca de tela passam de 1 s; o padrão do testing-library.
const SLOW = { timeout: 5000 };
const requestId = '12345678-1234-1234-1234-123456789012';
const ok = (data: unknown) => ({ data, status: 200, headers: {}, config: { headers: {} }, statusText: '' }) as AxiosResponse;

function mockEmailChangeApi(sessionRenewed: boolean) {
  return vi.spyOn(apiClient, 'request').mockImplementation(async (config: AxiosRequestConfig) => {
    if (config.url === '/api/users/email/change') return ok({ requestId, expiresAt: new Date(Date.now() + 600_000).toISOString() });
    if (config.url === '/api/users/email/change/confirm') return ok({ code: 'identity_changed', sessionRenewed });
    return ok(undefined);
  });
}

async function changeEmailFromOptions(user: Awaited<ReturnType<typeof renderAuthenticatedApp>>['user']) {
  expect(await screen.findByRole('heading', { name: 'Painel inicial' }, SLOW)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^opções/i }));
  await user.type(await screen.findByLabelText('Novo email de autenticação', {}, SLOW), 'novo@hemodinks.com');
  await user.click(screen.getByRole('button', { name: 'Continuar alteração de email' }));
  await user.type(screen.getByLabelText('Senha atual da conta individual'), 'SenhaAtual@123');
  await user.click(screen.getByRole('button', { name: 'Enviar confirmação' }));
  await user.type(await screen.findByLabelText('Código de confirmação'), '482913');
  await user.click(screen.getByRole('button', { name: 'Confirmar email' }));
}

describe('App — troca de email de autenticação (#286)', () => {
  beforeEach(() => { resetAppTestState(); clearIdentityNotice(); endSessionHandover(); });

  it('mantém o titular conectado com a sessão nova, sem voltar ao login', async () => {
    mockEmailChangeApi(true);
    const { user } = await renderAuthenticatedApp();
    const renewed = mockSession({ email: 'novo@hemodinks.com' });
    vi.mocked(restoreSession).mockResolvedValueOnce({ ...toLoginResponse(renewed), token: 'jwt-token-renovado' });

    await changeEmailFromOptions(user);

    await waitFor(() => expect(restoreSession).toHaveBeenCalledTimes(2), SLOW);
    await waitFor(() => expect(screen.getByText(/Email alterado para novo@hemodinks.com. Você continua conectado/)).toBeInTheDocument(), SLOW);
    expect(screen.queryByRole('heading', { name: 'Acesso ao sistema' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configurações' })).toBeInTheDocument();
  });

  it('um 401 do token antigo durante a troca não encerra a sessão', async () => {
    mockEmailChangeApi(true);
    const { user, session } = await renderAuthenticatedApp();
    let finish: (value: ReturnType<typeof toLoginResponse>) => void = () => {};
    vi.mocked(restoreSession).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));

    await changeEmailFromOptions(user);
    await waitFor(() => expect(restoreSession).toHaveBeenCalledTimes(2), SLOW);
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { token: session.token } }));
    // O 401 chega antes da sessão nova: se encerrasse a sessão, o login já estaria na tela.
    expect(screen.queryByRole('heading', { name: 'Acesso ao sistema' })).not.toBeInTheDocument();
    await act(async () => finish({ ...toLoginResponse(mockSession({ email: 'novo@hemodinks.com' })), token: 'jwt-token-renovado' }));

    // A sessão nova remonta a área autenticada: consulta de novo a cada tentativa.
    await waitFor(() => expect(screen.getByText(/Você continua conectado/)).toBeInTheDocument(), SLOW);
    expect(screen.queryByRole('heading', { name: 'Acesso ao sistema' })).not.toBeInTheDocument();
  });

  it('não aceita sessão restaurada de outro usuário', async () => {
    mockEmailChangeApi(true);
    const { user } = await renderAuthenticatedApp();
    vi.mocked(restoreSession).mockResolvedValueOnce({ ...toLoginResponse(mockSession({ id: 7, email: 'outro@hemodinks.com' })), token: 'outro' });

    await changeEmailFromOptions(user);

    expect(await screen.findByRole('heading', { name: 'Acesso ao sistema' }, SLOW)).toBeInTheDocument();
    expect(screen.getByText('Email alterado. Entre novamente com o novo email e a mesma senha.')).toBeInTheDocument();
  });

  it('volta ao login avisando que a senha é a mesma quando a sessão não pode ser renovada', async () => {
    mockEmailChangeApi(true);
    const { user } = await renderAuthenticatedApp();
    vi.mocked(restoreSession).mockResolvedValueOnce(null);

    await changeEmailFromOptions(user);

    expect(await screen.findByRole('heading', { name: 'Acesso ao sistema' }, SLOW)).toBeInTheDocument();
    expect(screen.getByText('Email alterado. Entre novamente com o novo email e a mesma senha.')).toBeInTheDocument();
  });

  it('sem renovação pela API, segue para o login sem tentar restaurar', async () => {
    mockEmailChangeApi(false);
    const { user } = await renderAuthenticatedApp();

    await changeEmailFromOptions(user);

    expect(await screen.findByRole('heading', { name: 'Acesso ao sistema' }, SLOW)).toBeInTheDocument();
    expect(screen.getByText('Email alterado. Entre novamente com o novo email e a mesma senha.')).toBeInTheDocument();
    expect(restoreSession).toHaveBeenCalledTimes(1);
  });
});
