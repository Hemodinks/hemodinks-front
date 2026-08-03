import { act, renderHook, waitFor } from '@testing-library/react';
import type { ChangeEvent, FormEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readProfilePhoto } from '../../shared/utils/files';
import { mockSession } from '../../test/appTestData';
import { TEST_CURRENT_PASSWORD } from '../../test/passwordFixtures';
import type { ClinicPayload, PlatformClinic } from './clinicTypes';
import { useClinicsGateway } from './useClinicsGateway';
import { EMPTY_CLINIC_FORM, useClinicsController } from './useClinicsController';

vi.mock('./useClinicsGateway', () => ({ useClinicsGateway: vi.fn() }));
vi.mock('../../shared/utils/files', () => ({ readProfilePhoto: vi.fn() }));

const clinic: PlatformClinic = {
  id: 2,
  nome: 'Clínica Recife',
  slug: 'clinica-recife',
  fotoUrl: '/uploads/clinic.jpg',
  ativa: true,
  plano: 'Parcial',
  modulosLiberados: ['pacientes'],
  assinaturaStatus: 'Ativa',
  limiteUsuarios: 10,
  usuarios: 3,
  trialAte: '2026-08-20T00:00:00Z',
  assinaturaValidaAte: '2027-01-01T00:00:00Z',
  dataCadastro: '2026-07-01T00:00:00Z',
};

const gateway = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deactivate: vi.fn(),
  select: vi.fn(),
};

function photoEvent(file?: File) {
  return {
    target: { files: file ? [file] : [], value: 'selected' },
  } as unknown as ChangeEvent<HTMLInputElement>;
}

function submitEvent() {
  return { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
}

function renderController(isSuperAdmin = true) {
  const onClinicSelected = vi.fn();
  return {
    ...renderHook(() =>
      useClinicsController({ session: mockSession(), isSuperAdmin, onClinicSelected }),
    ),
    onClinicSelected,
  };
}

describe('useClinicsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useClinicsGateway).mockReturnValue(gateway);
    gateway.list.mockResolvedValue([clinic]);
    gateway.create.mockResolvedValue(clinic);
    gateway.update.mockResolvedValue(clinic);
    gateway.deactivate.mockResolvedValue(undefined);
    gateway.select.mockResolvedValue({ token: 'new-token', clinicaId: clinic.id });
  });

  it('carrega clínicas e controla abertura para criação e edição', async () => {
    const { result } = renderController();
    await waitFor(() => expect(result.current.clinics).toEqual([clinic]));

    act(() => result.current.openNew());
    expect(result.current.formOpen).toBe(true);
    expect(result.current.form).toEqual(EMPTY_CLINIC_FORM);

    act(() => result.current.openEdit(clinic));
    expect(result.current.editing).toEqual(clinic);
    expect(result.current.form.nome).toBe('Clínica Recife');
    expect(result.current.form.trialAte).toBe('2026-08-20');

    const regular = renderController(false);
    await waitFor(() => expect(regular.result.current.clinics).toEqual([clinic]));
    act(() => regular.result.current.openNew());
    expect(regular.result.current.formOpen).toBe(false);
  });

  it('valida e carrega a foto da clínica', async () => {
    const { result } = renderController();
    await act(() => result.current.handlePhotoChange(photoEvent()));
    await act(() =>
      result.current.handlePhotoChange(
        photoEvent(new File(['x'], 'clinic.gif', { type: 'image/gif' })),
      ),
    );
    expect(result.current.error).toBe('Use uma foto PNG, JPG ou WEBP.');

    const oversized = new File(['x'], 'clinic.png', { type: 'image/png' });
    Object.defineProperty(oversized, 'size', { value: 2 * 1024 * 1024 });
    await act(() => result.current.handlePhotoChange(photoEvent(oversized)));
    expect(result.current.error).toBe('A foto deve ter no maximo 1 MB.');

    vi.mocked(readProfilePhoto).mockResolvedValue('data:image/webp;base64,photo');
    await act(() =>
      result.current.handlePhotoChange(
        photoEvent(new File(['x'], 'clinic.webp', { type: 'image/webp' })),
      ),
    );
    expect(result.current.photoPreview).toBe('data:image/webp;base64,photo');
  });

  it('valida plano parcial e envia criação ou edição', async () => {
    const { result } = renderController();
    await waitFor(() => expect(gateway.list).toHaveBeenCalled());
    act(() => {
      result.current.openNew();
      result.current.setForm({ ...EMPTY_CLINIC_FORM, plano: 'Parcial' });
    });
    await act(() => result.current.submit(submitEvent()));
    expect(result.current.error).toContain('Selecione ao menos um módulo');

    act(() =>
      result.current.setForm({
        ...EMPTY_CLINIC_FORM,
        nome: ' Clínica Nova ',
        slug: ' CLINICA-NOVA ',
        plano: 'Trial',
        trialAte: '2026-09-01',
        administradorNome: ' Admin ',
        administradorEmail: ' admin@example.com ',
        administradorSenha: TEST_CURRENT_PASSWORD,
        administradorTelefone: ' 81999999999 ',
      }),
    );
    await act(() => result.current.submit(submitEvent()));
    expect(gateway.create).toHaveBeenCalledWith(
      expect.objectContaining<Partial<ClinicPayload>>({
        nome: 'Clínica Nova',
        slug: 'clinica-nova',
        administradorEmail: 'admin@example.com',
      }),
    );

    act(() => result.current.openEdit(clinic));
    await act(() => result.current.submit(submitEvent()));
    expect(gateway.update).toHaveBeenCalledWith(clinic.id, expect.any(Object));
  });

  it('desativa e troca de clínica, apresentando falhas do gateway', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    const { result, onClinicSelected } = renderController();
    await waitFor(() => expect(result.current.clinics).toHaveLength(1));

    await act(() => result.current.deactivate(clinic));
    expect(gateway.deactivate).not.toHaveBeenCalled();
    await act(() => result.current.deactivate(clinic));
    expect(gateway.deactivate).toHaveBeenCalledWith(clinic.id);

    await act(() => result.current.switchClinic(clinic));
    expect(onClinicSelected).toHaveBeenCalledWith({ token: 'new-token', clinicaId: clinic.id });

    gateway.select.mockRejectedValueOnce(new Error('Falha na troca'));
    await act(() => result.current.switchClinic(clinic));
    expect(result.current.error).toBe('Falha na troca');
    confirmSpy.mockRestore();
  });
});
