import { CheckCircle2, ChevronLeft, ChevronRight, CircleCheck, CircleX, Info, Mail, Pencil, Phone, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { User } from '../../types';
import { AlertMessage, Button, DataPanel, IconButton, SearchField, ToastMessage } from '../../shared/components/ui';
import { SortableTableHeader } from '../../shared/components/SortableTableHeader';
import { formatPersonName, formatProfileName } from '../../shared/utils/formatters';
import { scrollListCarousel } from '../../shared/utils/carousel';
import { UserAvatar } from './UserAvatar';

type UserListProps = {
  users: User[];
  usersLoading: boolean;
  usersError: string;
  successMessage: string;
  usersTotalItems: number;
  visibleStart: number;
  visibleEnd: number;
  currentPage: number;
  totalPages: number;
  searchTerm: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  sessionToken: string;
  canManageUsers: boolean;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number | ((current: number) => number)) => void;
  onSortChange: (field: string) => void;
  onRefresh: () => void;
  onOpenNewUserForm: () => void;
  onEditUser: (user: User) => void | Promise<void>;
  onDeleteUser: (user: User) => void | Promise<void>;
  onSelectInfoUser: (user: User) => void;
  onSelectContactUser: (user: User) => void;
};

export function UserList({
  users,
  usersLoading,
  usersError,
  successMessage,
  usersTotalItems,
  visibleStart,
  visibleEnd,
  currentPage,
  totalPages,
  searchTerm,
  sortBy,
  sortDirection,
  sessionToken,
  canManageUsers,
  onSearchChange,
  onPageChange,
  onSortChange,
  onRefresh,
  onOpenNewUserForm,
  onEditUser,
  onDeleteUser,
  onSelectInfoUser,
  onSelectContactUser,
}: UserListProps) {
  return (
    <DataPanel data-tour="users-list">
      <div className="data-header">
        <div>
          <span className="eyebrow">Base de usuários</span>
          <h2>{usersTotalItems} cadastrados</h2>
        </div>

        <div className="table-tools">
          {canManageUsers && (
            <Button onClick={onOpenNewUserForm} data-tour="users-new">
              <Plus size={17} />
              Novo usuário
            </Button>
          )}
          <div data-tour="users-search"><SearchField
            label="Buscar usuários"
            value={searchTerm}
            onValueChange={onSearchChange}
          /></div>
          <IconButton label="Atualizar lista de usuários" onClick={onRefresh} title="Atualizar lista">
            <RefreshCw size={18} />
          </IconButton>
        </div>
      </div>

      {successMessage && <ToastMessage type="success" icon={<CheckCircle2 size={17} />}>{successMessage}</ToastMessage>}
      {usersError && <AlertMessage type="error">{usersError}</AlertMessage>}

      <div className="carousel-shell">
        <button
          type="button"
          className="carousel-nav carousel-nav-left"
          onClick={(event) => scrollListCarousel(event, 'previous')}
          aria-label="Voltar no carrossel de usuários"
          title="Voltar no carrossel"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="table-wrap list-carousel-wrap users-carousel-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <SortableTableHeader field="nome" label="Nome" activeField={sortBy} direction={sortDirection} onSortChange={onSortChange} />
                {canManageUsers && <th>Ações</th>}
                <SortableTableHeader field="perfil" label="Perfil" activeField={sortBy} direction={sortDirection} onSortChange={onSortChange} />
                <th>Info</th>
                <th>Contato</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr>
                  <td colSpan={canManageUsers ? 5 : 4} className="empty-row">Carregando usuários...</td>
                </tr>
              ) : users.length ? (
                users.map((user) => {
                  const displayName = formatPersonName(user.nome);

                  return (
                  <tr key={user.id}>
                    <td data-label="Nome">
                      <div className="name-cell">
                        <UserAvatar userId={user.id} name={user.nome} photo={user.fotoPerfil} authToken={sessionToken} size="sm" />
                        <span>{displayName}</span>
                      </div>
                    </td>
                    {canManageUsers && (
                      <td data-label="Ações">
                        <div className="row-actions">
                          <IconButton label={`Editar ${displayName}`} tone="muted" onClick={() => void onEditUser(user)} title="Editar">
                            <Pencil size={17} />
                          </IconButton>
                          <IconButton label={`Excluir ${displayName}`} tone="danger" onClick={() => void onDeleteUser(user)} title="Excluir">
                            <Trash2 size={17} />
                          </IconButton>
                        </div>
                      </td>
                    )}
                    <td data-label="Perfil">{formatProfileName(user.perfilId, user.perfilNome)}</td>
                    <td data-label="Info">
                      <button
                        type="button"
                        className={`status-info-button ${user.ativo ? 'active' : 'inactive'}`}
                        title={`${user.ativo ? 'Ativo' : 'Inativo'} - clique para ver detalhes`}
                        aria-label={`Detalhes de ${displayName}`}
                        onClick={() => onSelectInfoUser(user)}
                      >
                        {user.ativo ? <CircleCheck size={19} /> : <CircleX size={19} />}
                        <Info size={15} />
                      </button>
                    </td>
                    <td data-label="Contato">
                      <button
                        type="button"
                        className="status-info-button contact"
                        title="Ver informacoes de contato"
                        aria-label={`Contato de ${displayName}`}
                        onClick={() => onSelectContactUser(user)}
                      >
                        <Mail size={18} />
                        <Phone size={14} />
                      </button>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={canManageUsers ? 5 : 4} className="empty-row">Nenhum usuário encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="carousel-nav carousel-nav-right"
          onClick={(event) => scrollListCarousel(event, 'next')}
          aria-label="Avançar no carrossel de usuários"
          title="Avançar no carrossel"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="pagination-bar">
        <span>
          {visibleStart}-{visibleEnd} de {usersTotalItems}
        </span>
        <div className="pagination-actions">
          <IconButton
            label="Página anterior de usuários"
            onClick={() => onPageChange((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            title="Página anterior"
          >
            <ChevronLeft size={18} />
          </IconButton>
          <span className="page-indicator">Página {currentPage} de {totalPages}</span>
          <IconButton
            label="Próxima página de usuários"
            onClick={() => onPageChange((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            title="Próxima página"
          >
            <ChevronRight size={18} />
          </IconButton>
        </div>
      </div>
    </DataPanel>
  );
}
