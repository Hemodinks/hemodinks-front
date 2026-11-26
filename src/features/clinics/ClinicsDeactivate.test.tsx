import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockSession } from '../../test/appTestData';
import { deactivatePlatformClinic, listPlatformClinics } from '../../services';
import type { PlatformClinic } from '../../types';
import { SUPER_ADMIN_PROFILE_ID } from '../../shared/utils/formatters';
import { ClinicsPage } from './ClinicsPage';

vi.mock('../../services', async (original) => ({
  ...await original<typeof import('../../services')>(), listPlatformClinics: vi.fn(), deactivatePlatformClinic: vi.fn(),
}));

const clinic = (id: number, nome: string): PlatformClinic => ({
  id, nome, slug: `c${id}`, ativa: true, plano: 'Completo', modulosLiberados: [], assinaturaStatus: 'Ativa', dataCadastro: '2026-01-01',
});

async function setup() {
  vi.mocked(listPlatformClinics).mockResolvedValue([clinic(1, 'Clinica Atual'), clinic(2, 'Clinica Beta')]);
  vi.mocked(deactivatePlatformClinic).mockResolvedValue(undefined as never);
  render(<MemoryRouter><ClinicsPage session={mockSession({ perfilId: SUPER_ADMIN_PROFILE_ID, clinicaId: 1 })} onClinicSelected={vi.fn()} /></MemoryRouter>);
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Desativar Clinica Beta' }));
  return user;
}

// #311: desativar clínica confirma no Modal do sistema, sem window.confirm.
describe('clínicas: desativar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cancelar não desativa', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const user = await setup();
    expect(await screen.findByRole('dialog', { name: 'Desativar clínica?' })).toHaveTextContent('Clinica Beta');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(deactivatePlatformClinic).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('confirmar desativa e recarrega a lista', async () => {
    const user = await setup();
    await screen.findByRole('dialog', { name: 'Desativar clínica?' });
    await user.click(screen.getByRole('button', { name: 'Desativar' }));
    await waitFor(() => expect(deactivatePlatformClinic).toHaveBeenCalledWith(2, expect.any(String)));
    expect(await screen.findByText('Clinica desativada.')).toBeInTheDocument();
    expect(listPlatformClinics).toHaveBeenCalledTimes(2);
  });
});
