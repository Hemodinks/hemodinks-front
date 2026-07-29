import {
  CheckCircle2,
  CircleCheck,
  CircleX,
  Info,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { User } from './userTypes';
import {
  AlertMessage,
  Button,
  DataPanel,
  IconButton,
  SearchField,
} from '../../shared/components/ui';
import { formatPersonName, formatProfileName } from '../../shared/utils/formatters';
import { UserAvatar } from '../../shared/components/UserAvatar';
import {
  HorizontalTableScroller,
  ListToolbar,
  Pagination,
  SortableHeader,
  TableStateRow,
} from '../../shared/components/listing';

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
      <ListToolbar eyebrow="Base de usuários" title={`${usersTotalItems} cadastrados`}>
        <Button onClick={onOpenNewUserForm}>
          <Plus size={17} />
          Novo usuário
        </Button>
        <SearchField label="Buscar usuários" value={searchTerm} onValueChange={onSearchChange} />
        <IconButton label="Atualizar lista de usuários" onClick={onRefresh} title="Atualizar lista">
          <RefreshCw size={18} />
        </IconButton>
      </ListToolbar>

      {successMessage && (
        <AlertMessage type="success" icon={<CheckCircle2 size={17} />}>
          {successMessage}
        </AlertMessage>
      )}
      {usersError && <AlertMessage type="error">{usersError}</AlertMessage>}

      <HorizontalTableScroller entityLabel="usuários" className="users-carousel-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <SortableHeader
                field="nome"
                label="Nome"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortChange={onSortChange}
              />
              <SortableHeader
                field="perfil"
                label="Perfil"
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortChange={onSortChange}
              />
              <th>Info</th>
              <th>Contato</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {usersLoading || !users.length ? (
              <TableStateRow
                colSpan={5}
                loading={usersLoading}
                empty={!users.length}
                loadingLabel="Carregando usuários..."
                emptyLabel="Nenhum usuário encontrado."
              />
            ) : (
              users.map((user) => {
                const displayName = formatPersonName(user.nome);

                return (
                <tr key={user.id}>
                  <td data-label="Nome">
                    <div className="name-cell">
                      <UserAvatar
                        userId={user.id}
                        name={user.nome}
                        photo={user.fotoPerfil}
                        authToken={sessionToken}
                        size="sm"
                      />
                      <span>{displayName}</span>
                    </div>
                  </td>
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
                  <td data-label="Ações">
                    <div className="row-actions">
                      <IconButton
                        label={`Editar ${displayName}`}
                        tone="muted"
                        onClick={() => void onEditUser(user)}
                        title="Editar"
                      >
                        <Pencil size={17} />
                      </IconButton>
                      <IconButton
                        label={`Excluir ${displayName}`}
                        tone="danger"
                        onClick={() => void onDeleteUser(user)}
                        title="Excluir"
                      >
                        <Trash2 size={17} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </HorizontalTableScroller>

      <Pagination
        entityLabel="usuários"
        visibleStart={visibleStart}
        visibleEnd={visibleEnd}
        totalItems={usersTotalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </DataPanel>
  );
}
