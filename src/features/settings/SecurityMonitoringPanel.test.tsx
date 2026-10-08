import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
import { apiClient, AUTH_EXPIRED_EVENT } from '../../services/api';
import { mockSession } from '../../test/appTestData';
import { SecurityMonitoringPanel } from './SecurityMonitoringPanel';

const event = { timestamp: '2026-10-07T19:00:00Z', kind: 'AuthenticationSucceeded', operation: 'login', reason: 'completed', clinicId: 1 };
const response = (data: unknown, status = 200) => ({ data, status, headers: {}, config: { headers: {} }, statusText: '' }) as AxiosResponse;
const page = (items: unknown[], page = 1) => response({ items, page, pageSize: 25 });
afterEach(() => vi.restoreAllMocks());

it.each([2, 3, 4, 6])('não consulta nem apresenta dados para perfil %s', perfilId => {
  const request = vi.spyOn(apiClient, 'request');
  render(<SecurityMonitoringPanel session={mockSession({ perfilId, clinicaId: 1 })} />);
  expect(screen.getByRole('alert')).toHaveTextContent('não permitido');
  expect(request).not.toHaveBeenCalled();
});

it('apresenta eventos da clínica sem pseudônimos, segredos ou metadados internos', async () => {
  const secrets = ['private-secret', 'sensitive@example.com', 'private-request', 'a'.repeat(64)];
  vi.spyOn(apiClient, 'request').mockResolvedValue(page([{ ...event, requestId: secrets[2], accountKey: secrets[3], token: secrets[0], email: secrets[1] },
    { ...event, kind: secrets[0], operation: secrets[1], reason: secrets[0] }]));
  const consoleSpy = vi.spyOn(console, 'error');
  const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
  render(<SecurityMonitoringPanel session={mockSession({ perfilId: 1, clinicaId: 1 })} />);
  expect(await screen.findByText('Autenticação concluída')).toBeInTheDocument();
  expect(screen.getByText('Evento não identificado')).toBeInTheDocument();
  expect(screen.getByText(/Eventos da clínica atual/)).toBeInTheDocument();
  for (const secret of secrets) expect(document.body.innerHTML).not.toContain(secret);
  expect(storageSpy).not.toHaveBeenCalled();
  expect(consoleSpy).not.toHaveBeenCalled();
});

it.each([2, null])('recusa toda a página com evento fora do contexto: %s', clinicId => {
  vi.spyOn(apiClient, 'request').mockResolvedValue(page([{ ...event, clinicId }]));
  render(<SecurityMonitoringPanel session={mockSession({ perfilId: 1, clinicaId: 1 })} />);
  return screen.findByRole('alert').then(alert => {
    expect(alert).toHaveTextContent('neste contexto');
    expect(screen.queryByText('Autenticação concluída')).not.toBeInTheDocument();
  });
});

it('visão global é exclusiva de plataforma e mostra somente escopo autorizado pela API', async () => {
  vi.spyOn(apiClient, 'request').mockResolvedValue(page([{ ...event, clinicId: 2 },
    { ...event, kind: 'SuspiciousPattern', operation: 'detection', reason: 'multiple_accounts', clinicId: null }]));
  render(<SecurityMonitoringPanel session={mockSession({ perfilId: 5, clinicaId: 1 })} />);
  expect(await screen.findByText('Clínica 2')).toBeInTheDocument();
  expect(screen.getByText('Plataforma / pré-login')).toBeInTheDocument();
  expect(screen.getByText('Recusas em múltiplas contas')).toBeInTheDocument();
  expect(screen.getByText(/Visão global da plataforma/)).toBeInTheDocument();
});

it('remove a visão global imediatamente ao perder o perfil permitido', async () => {
  const request = vi.spyOn(apiClient, 'request').mockResolvedValue(page([{ ...event, clinicId: 2 }]));
  const session = mockSession({ perfilId: 5, clinicaId: 1 });
  const view = render(<SecurityMonitoringPanel session={session} />);
  await screen.findByText('Clínica 2');
  view.rerender(<SecurityMonitoringPanel session={{ ...session, user: { ...session.user, perfilId: 2 } }} />);
  expect(screen.queryByText('Clínica 2')).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('não permitido');
  expect(request).toHaveBeenCalledOnce();
});

it('pagina sem inventar totais, apresenta vazio e permite voltar', async () => {
  const request = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(page(Array.from({ length: 25 }, () => event)))
    .mockResolvedValueOnce(page([], 2)).mockResolvedValueOnce(page([event]));
  render(<SecurityMonitoringPanel session={mockSession({ perfilId: 1, clinicaId: 1 })} />);
  await screen.findByText('Página 1 · 25 evento(s) nesta página');
  fireEvent.click(screen.getByRole('button', { name: 'Próxima página de eventos' }));
  expect(await screen.findByText('Nenhum evento de segurança nesta página.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Próxima página de eventos' })).toBeDisabled();
  expect(request.mock.calls[1][0].params.toString()).toBe('page=2&pageSize=25');
  fireEvent.click(screen.getByRole('button', { name: 'Página anterior de eventos' }));
  await screen.findByText('Página 1 · 1 evento(s) nesta página');
});

it('troca de clínica oculta dados imediatamente, cancela consulta e ignora resposta atrasada', async () => {
  let complete!: (value: AxiosResponse) => void;
  const request = vi.spyOn(apiClient, 'request').mockResolvedValueOnce(page([event]))
    .mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }))
    .mockResolvedValueOnce(page([{ ...event, kind: 'CredentialChanged', clinicId: 2 }]));
  const first = mockSession({ perfilId: 1, clinicaId: 1 });
  const view = render(<SecurityMonitoringPanel session={first} />);
  await screen.findByText('Autenticação concluída');
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar eventos' }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  const signal = request.mock.calls[1][0].signal;
  view.rerender(<SecurityMonitoringPanel session={{ ...first, user: { ...first.user, clinicaId: 2 } }} />);
  expect(screen.queryByText('Autenticação concluída')).not.toBeInTheDocument();
  expect(signal?.aborted).toBe(true);
  await screen.findByText('Senha alterada');
  complete(page([event]));
  await waitFor(() => expect(screen.queryByText('Autenticação concluída')).not.toBeInTheDocument());
});

it.each([401, 403, 503])('erro %s é local e permite tentar novamente sem expirar sessão', async status => {
  const expired = vi.fn();
  window.addEventListener(AUTH_EXPIRED_EVENT, expired);
  vi.spyOn(apiClient, 'request').mockRejectedValueOnce(new AxiosError('private-secret', undefined, undefined, undefined,
    response({ message: 'private-secret' }, status))).mockResolvedValueOnce(page([event]));
  try {
    render(<SecurityMonitoringPanel session={mockSession({ perfilId: 1, clinicaId: 1 })} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(document.body.innerHTML).not.toContain('private-secret');
    expect(expired).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar eventos' }));
    expect(await screen.findByText('Autenticação concluída')).toBeInTheDocument();
  } finally { window.removeEventListener(AUTH_EXPIRED_EVENT, expired); }
});
