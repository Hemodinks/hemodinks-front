import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AuthSession, User, UserFormData } from '../../types';
import { UserList } from './UserList';
import { UserForm } from './UserForm';
import { emptyUserForm, isReadOnlySuperAdmin } from './userUtils';

vi.mock('../../services/usersService', () => ({ generateTemporaryPassword: vi.fn() }));

const SUPER = 5;
const ADMIN = 1;
const superUser = { id: 1, nome: 'George Marcone', ativo: true, perfilId: SUPER, perfilNome: 'SuperAdministrador' } as User;
const adminUser = { id: 2, nome: 'George Santos', ativo: true, perfilId: ADMIN, perfilNome: 'Administrador' } as User;

function renderList(isSuperAdmin: boolean, handlers = { onEditUser: vi.fn(), onDeleteUser: vi.fn() }) {
  render(<UserList users={[superUser, adminUser]} usersLoading={false} usersError="" successMessage=""
    usersTotalItems={2} visibleStart={1} visibleEnd={2} currentPage={1} totalPages={1} searchTerm=""
    sortBy="nome" sortDirection="asc" sessionToken="token" canManageUsers isSuperAdmin={isSuperAdmin}
    onSearchChange={vi.fn()} onPageChange={vi.fn()} onSortChange={vi.fn()} onRefresh={vi.fn()}
    onOpenNewUserForm={vi.fn()} onSelectInfoUser={vi.fn()} onSelectContactUser={vi.fn()} {...handlers} />);
  return handlers;
}

function renderForm(isSuperAdmin: boolean, target: User) {
  const formData: UserFormData = { ...emptyUserForm, nome: target.nome, email: 'x@exemplo.com', perfilId: target.perfilId, ativo: true };
  render(<UserForm identitySession={{ token: 't', user: { id: 99, perfilId: isSuperAdmin ? SUPER : ADMIN } } as AuthSession}
    onIdentityChanged={vi.fn()} canAccessUsers canUseUserForm isSuperAdmin={isSuperAdmin} editingId={target.id}
    editingUserDetails={target} formData={formData} formError="" formLoading={false} pendingUserFiles={[]}
    photoInputKey={0} userFileInputKey={0} sessionToken="token" setFormData={vi.fn()} onClose={vi.fn()}
    onSubmit={vi.fn()} onProfilePhotoChange={vi.fn()} onRemoveProfilePhoto={vi.fn()} onUserFilesChange={vi.fn()}
    onRemovePendingUserFile={vi.fn()} onDeleteUserArquivo={vi.fn()} />);
}

describe('cadastro de SuperAdministrador para perfis inferiores', () => {
  it('regra: só perfil inferior olhando um SuperAdministrador fica somente leitura', () => {
    expect(isReadOnlySuperAdmin(SUPER, false)).toBe(true);
    expect(isReadOnlySuperAdmin(SUPER, true)).toBe(false);
    expect(isReadOnlySuperAdmin(ADMIN, false)).toBe(false);
    expect(isReadOnlySuperAdmin(undefined, false)).toBe(false);
  });

  it('Administrador vê apenas "Visualizar" no SuperAdministrador e mantém editar/excluir nos demais', () => {
    const handlers = renderList(false);
    expect(screen.queryByRole('button', { name: 'Editar George Marcone' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir George Marcone' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gerar senha temporária para George Marcone' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Visualizar George Marcone' }));
    expect(handlers.onEditUser).toHaveBeenCalledWith(superUser);
    expect(screen.getByRole('button', { name: 'Editar George Santos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir George Santos' })).toBeInTheDocument();
  });

  it('SuperAdministrador continua podendo editar e excluir outro SuperAdministrador', () => {
    renderList(true);
    expect(screen.getByRole('button', { name: 'Editar George Marcone' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir George Marcone' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Visualizar George Marcone' })).not.toBeInTheDocument();
  });

  it('formulário abre em modo consulta, sem salvar, trocar foto ou mudar status', () => {
    renderForm(false, superUser);
    expect(screen.getByRole('heading', { name: 'Visualizar usuário' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Salvar alterações/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Trocar foto')).not.toBeInTheDocument();
    expect(screen.getByText('Somente um SuperAdministrador pode alterar este cadastro.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toBeDisabled();
    expect(screen.getByLabelText('Usuário ativo')).toBeDisabled();
  });

  it('SuperAdministrador edita normalmente', () => {
    renderForm(true, superUser);
    expect(screen.getByRole('heading', { name: 'Editar usuário' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar alterações/ })).toBeEnabled();
    expect(screen.getByLabelText('Nome completo')).toBeEnabled();
  });
});
