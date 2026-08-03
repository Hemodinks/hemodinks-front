import { CircleCheck, CircleX, Info, Mail, Pencil, Phone, Trash2 } from 'lucide-react';
import {
  HorizontalTableScroller,
  SortableHeader,
  TableStateRow,
} from '../../shared/components/listing';
import { IconButton } from '../../shared/components/ui';
import { UserAvatar } from '../../shared/components/UserAvatar';
import { formatPersonName, formatProfileName } from '../../shared/utils/formatters';
import type { User } from './userTypes';

type UserListTableProps = {
  onDeleteUser: (user: User) => void | Promise<void>;
  onEditUser: (user: User) => void | Promise<void>;
  onSelectContactUser: (user: User) => void;
  onSelectInfoUser: (user: User) => void;
  onSortChange: (field: string) => void;
  sessionToken: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  users: User[];
  usersLoading: boolean;
};

type UserListRowProps = Pick<
  UserListTableProps,
  'onDeleteUser' | 'onEditUser' | 'onSelectContactUser' | 'onSelectInfoUser' | 'sessionToken'
> & {
  user: User;
};

function UserListRow({
  onDeleteUser,
  onEditUser,
  onSelectContactUser,
  onSelectInfoUser,
  sessionToken,
  user,
}: UserListRowProps) {
  const displayName = formatPersonName(user.nome);

  return (
    <tr>
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
}

export function UserListTable({
  onDeleteUser,
  onEditUser,
  onSelectContactUser,
  onSelectInfoUser,
  onSortChange,
  sessionToken,
  sortBy,
  sortDirection,
  users,
  usersLoading,
}: UserListTableProps) {
  return (
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
            users.map((user) => (
              <UserListRow
                key={user.id}
                user={user}
                sessionToken={sessionToken}
                onEditUser={onEditUser}
                onDeleteUser={onDeleteUser}
                onSelectInfoUser={onSelectInfoUser}
                onSelectContactUser={onSelectContactUser}
              />
            ))
          )}
        </tbody>
      </table>
    </HorizontalTableScroller>
  );
}
