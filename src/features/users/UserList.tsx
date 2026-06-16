import { CheckCircle2, ChevronLeft, ChevronRight, CircleCheck, CircleX, Info, Mail, Pencil, Phone, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { User } from '../../types';
import { AlertMessage, Button, DataPanel, IconButton, SearchField } from '../../shared/components/ui';
import { getProfileName } from '../../shared/utils/formatters';
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
    <DataPanel>
      <div className="data-header">
        <div>
          <span className="eyebrow">Base de usuarios</span>
          <h2>{usersTotalItems} cadastrados</h2>
        </div>

        <div className="table-tools">
          <Button onClick={onOpenNewUserForm}>
            <Plus size={17} />
            Novo usuario
          </Button>
          <SearchField
            label="Buscar usuarios"
            value={searchTerm}
            onValueChange={onSearchChange}
          />
          <IconButton label="Atualizar lista de usuarios" onClick={onRefresh} title="Atualizar lista">
            <RefreshCw size={18} />
          </IconButton>
        </div>
      </div>

      {successMessage && <AlertMessage type="success" icon={<CheckCircle2 size={17} />}>{successMessage}</AlertMessage>}
      {usersError && <AlertMessage type="error">{usersError}</AlertMessage>}

      <div className="carousel-shell">
        <button
          type="button"
          className="carousel-nav carousel-nav-left"
          onClick={(event) => scrollListCarousel(event, 'previous')}
          aria-label="Voltar no carrossel de usuarios"
          title="Voltar no carrossel"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="table-wrap list-carousel-wrap users-carousel-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('nome')} aria-sort={sortBy === 'nome' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Nome
                    {sortBy === 'nome' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('perfil')} aria-sort={sortBy === 'perfil' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Perfil
                    {sortBy === 'perfil' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>Info</th>
                <th>Contato</th>
                <th aria-label="Acoes" />
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr>
                  <td colSpan={5} className="empty-row">Carregando usuarios...</td>
                </tr>
              ) : users.length ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td data-label="Nome">
                      <div className="name-cell">
                        <UserAvatar userId={user.id} name={user.nome} photo={user.fotoPerfil} authToken={sessionToken} size="sm" />
                        <span>{user.nome}</span>
                      </div>
                    </td>
                    <td data-label="Perfil">{user.perfilNome || getProfileName(user.perfilId)}</td>
                    <td data-label="Info">
                      <button
                        type="button"
                        className={`status-info-button ${user.ativo ? 'active' : 'inactive'}`}
                        title={`${user.ativo ? 'Ativo' : 'Inativo'} - clique para ver detalhes`}
                        aria-label={`Detalhes de ${user.nome}`}
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
                        aria-label={`Contato de ${user.nome}`}
                        onClick={() => onSelectContactUser(user)}
                      >
                        <Mail size={18} />
                        <Phone size={14} />
                      </button>
                    </td>
                    <td data-label="Acoes">
                      <div className="row-actions">
                        <IconButton label={`Editar ${user.nome}`} tone="muted" onClick={() => void onEditUser(user)} title="Editar">
                          <Pencil size={17} />
                        </IconButton>
                        <IconButton label={`Excluir ${user.nome}`} tone="danger" onClick={() => void onDeleteUser(user)} title="Excluir">
                          <Trash2 size={17} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-row">Nenhum usuario encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="carousel-nav carousel-nav-right"
          onClick={(event) => scrollListCarousel(event, 'next')}
          aria-label="Avancar no carrossel de usuarios"
          title="Avancar no carrossel"
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
            label="Pagina anterior de usuarios"
            onClick={() => onPageChange((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            title="Pagina anterior"
          >
            <ChevronLeft size={18} />
          </IconButton>
          <span className="page-indicator">Pagina {currentPage} de {totalPages}</span>
          <IconButton
            label="Proxima pagina de usuarios"
            onClick={() => onPageChange((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            title="Proxima pagina"
          >
            <ChevronRight size={18} />
          </IconButton>
        </div>
      </div>
    </DataPanel>
  );
}
