import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ChangeEvent, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as services from '../../services';
import { readProfilePhoto } from '../../shared/utils/files';
import { mockSession, baseUser } from '../../test/appTestData';
import type { useUserForm } from './useUserForm';
import { useUserFiles } from './useUserFiles';

vi.mock('../../services', () => ({ deleteUserArquivo: vi.fn(), getUser: vi.fn() }));
vi.mock('../../shared/utils/files', () => ({ readProfilePhoto: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  );
}

function createUserForm() {
  return {
    setFormError: vi.fn(),
    setFormData: vi.fn(),
    setPhotoInputKey: vi.fn(),
    setPendingUserFiles: vi.fn(),
    setEditingUserDetails: vi.fn(),
    applyUserToForm: vi.fn(),
  } as unknown as ReturnType<typeof useUserForm>;
}

function fileEvent(files: File[]) {
  return { target: { files, value: 'selected' } } as unknown as ChangeEvent<HTMLInputElement>;
}

describe('useUserFiles', () => {
  beforeEach(() => vi.clearAllMocks());

  it('valida, carrega e remove a foto do perfil', async () => {
    const form = createUserForm();
    vi.mocked(readProfilePhoto).mockResolvedValue('data:image/png;base64,photo');
    const { result } = renderHook(() => useUserFiles(mockSession(), form), { wrapper });

    await act(() => result.current.handleProfilePhotoChange(fileEvent([])));
    await act(() =>
      result.current.handleProfilePhotoChange(
        fileEvent([new File(['x'], 'photo.gif', { type: 'image/gif' })]),
      ),
    );
    expect(form.setFormError).toHaveBeenCalledWith('Use uma foto PNG, JPG ou WEBP.');

    const oversized = new File(['x'], 'photo.png', { type: 'image/png' });
    Object.defineProperty(oversized, 'size', { value: 2 * 1024 * 1024 });
    await act(() => result.current.handleProfilePhotoChange(fileEvent([oversized])));
    expect(form.setFormError).toHaveBeenCalledWith('A foto deve ter no maximo 1 MB.');

    await act(() =>
      result.current.handleProfilePhotoChange(
        fileEvent([new File(['x'], 'photo.png', { type: 'image/png' })]),
      ),
    );
    expect(form.setFormData).toHaveBeenCalled();
    act(() => result.current.handleRemoveProfilePhoto());
    expect(form.setPhotoInputKey).toHaveBeenCalled();
  });

  it('valida anexos, remove pendências e exclui arquivo persistido', async () => {
    const form = createUserForm();
    vi.mocked(services.deleteUserArquivo).mockResolvedValue(undefined);
    vi.mocked(services.getUser).mockResolvedValue(baseUser);
    const { result } = renderHook(() => useUserFiles(mockSession(), form), { wrapper });

    act(() => result.current.handleFilesChange(fileEvent([])));
    act(() =>
      result.current.handleFilesChange(
        fileEvent([new File(['x'], 'malware.exe', { type: 'application/octet-stream' })]),
      ),
    );
    expect(form.setFormError).toHaveBeenCalledWith(expect.stringContaining('Use PDF'));

    act(() =>
      result.current.handleFilesChange(
        fileEvent([new File(['document'], 'crm.pdf', { type: 'application/pdf' })]),
      ),
    );
    expect(form.setPendingUserFiles).toHaveBeenCalled();
    act(() => result.current.removePendingFile(0));

    await act(() => result.current.deleteFile(baseUser, 8));
    expect(services.deleteUserArquivo).toHaveBeenCalledWith(baseUser.id, 8, 'jwt-token');
    expect(form.setEditingUserDetails).toHaveBeenCalledWith(baseUser);
    expect(form.applyUserToForm).toHaveBeenCalledWith(baseUser);
  });

  it('apresenta falhas de leitura e exclusão sem lançar erro', async () => {
    const form = createUserForm();
    vi.mocked(readProfilePhoto).mockRejectedValue(new Error('Falha na foto'));
    vi.mocked(services.deleteUserArquivo).mockRejectedValue(new Error('Falha ao excluir'));
    const { result } = renderHook(() => useUserFiles(mockSession(), form), { wrapper });

    await act(() =>
      result.current.handleProfilePhotoChange(
        fileEvent([new File(['x'], 'photo.webp', { type: 'image/webp' })]),
      ),
    );
    await act(() => result.current.deleteFile(baseUser, 9));
    await waitFor(() => expect(form.setFormError).toHaveBeenCalledWith('Falha ao excluir'));

    const withoutSession = renderHook(() => useUserFiles(null, form), { wrapper });
    await act(() => withoutSession.result.current.deleteFile(baseUser, 1));
    expect(services.deleteUserArquivo).toHaveBeenCalledTimes(1);
  });
});
