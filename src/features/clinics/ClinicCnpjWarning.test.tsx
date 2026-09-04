import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlatformClinic } from '../../types';
import { queryClient } from '../../queryClient';
import { mockSession } from '../../test/appTestData';
import { queryKeys } from '../../shared/queryKeys';
import { ClinicCnpjWarning } from './ClinicCnpjWarning';
import { getPlatformClinic } from '../../services';

vi.mock('../../services', () => ({ getPlatformClinic: vi.fn() }));

const clinic = (id: number, cnpj: string | null): PlatformClinic => ({
  id,
  nome: `Clínica ${id}`,
  slug: `clinica-${id}`,
  cnpj,
  ativa: true,
  plano: 'Completa',
  modulosLiberados: [],
  assinaturaStatus: 'Ativa',
  dataCadastro: '2026-09-04T00:00:00Z',
});

const renderWarning = (session = mockSession(), onUpdateClinic = vi.fn()) => render(
  <QueryClientProvider client={queryClient}>
    <ClinicCnpjWarning session={session} onUpdateClinic={onUpdateClinic} />
  </QueryClientProvider>,
);

describe('ClinicCnpjWarning', () => {
  beforeEach(() => vi.mocked(getPlatformClinic).mockReset());

  it.each([1, 5])('exibe aviso permanente para perfil administrativo %s quando falta CNPJ', async (perfilId) => {
    vi.mocked(getPlatformClinic).mockResolvedValue(clinic(1, null));
    const onUpdateClinic = vi.fn();
    renderWarning(mockSession({ perfilId }), onUpdateClinic);

    expect(await screen.findByText('Cadastro da clínica incompleto')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /atualizar clínica/i }));
    expect(onUpdateClinic).toHaveBeenCalledOnce();
  });

  it('não consulta nem exibe para perfis não administrativos', () => {
    renderWarning(mockSession({ perfilId: 2, perfilNome: 'Médicos' }));
    expect(getPlatformClinic).not.toHaveBeenCalled();
    expect(screen.queryByText('Cadastro da clínica incompleto')).not.toBeInTheDocument();
  });

  it('não exibe quando existe CNPJ e desaparece assim que o cadastro é atualizado', async () => {
    const session = mockSession();
    vi.mocked(getPlatformClinic).mockResolvedValue(clinic(1, null));
    renderWarning(session);
    expect(await screen.findByText('Cadastro da clínica incompleto')).toBeInTheDocument();

    queryClient.setQueryData(queryKeys.currentClinic(session.token, 1), clinic(1, '11222333000181'));
    await waitFor(() => expect(screen.queryByText('Cadastro da clínica incompleto')).not.toBeInTheDocument());
  });

  it('troca a consulta e o aviso junto com a clínica da sessão', async () => {
    vi.mocked(getPlatformClinic).mockImplementation(async (id) => clinic(id, id === 1 ? '11222333000181' : null));
    const firstSession = mockSession({ clinicaId: 1 });
    const view = renderWarning(firstSession);
    await waitFor(() => expect(getPlatformClinic).toHaveBeenCalledWith(1, firstSession.token));
    expect(screen.queryByText('Cadastro da clínica incompleto')).not.toBeInTheDocument();

    const secondSession = { ...firstSession, token: 'jwt-token-2', user: { ...firstSession.user, clinicaId: 2 } };
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <ClinicCnpjWarning session={secondSession} onUpdateClinic={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Cadastro da clínica incompleto')).toBeInTheDocument();
    expect(getPlatformClinic).toHaveBeenCalledWith(2, secondSession.token);
  });
});
