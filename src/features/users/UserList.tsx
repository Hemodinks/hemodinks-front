import { CheckCircle2, Plus, RefreshCw } from 'lucide-react';
import { ListToolbar, Pagination } from '../../shared/components/listing';
import {
  AlertMessage,
  Button,
  DataPanel,
  IconButton,
  SearchField,
} from '../../shared/components/ui';
import { UserListTable } from './UserListTable';
import type { User } from './userTypes';

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

export function UserList(props: UserListProps) {
  return (
    <DataPanel>
      <ListToolbar eyebrow="Base de usuários" title={`${props.usersTotalItems} cadastrados`}>
        <Button onClick={props.onOpenNewUserForm}>
          <Plus size={17} />
          Novo usuário
        </Button>
        <SearchField
          label="Buscar usuários"
          value={props.searchTerm}
          onValueChange={props.onSearchChange}
        />
        <IconButton
          label="Atualizar lista de usuários"
          onClick={props.onRefresh}
          title="Atualizar lista"
        >
          <RefreshCw size={18} />
        </IconButton>
      </ListToolbar>

      {props.successMessage && (
        <AlertMessage type="success" icon={<CheckCircle2 size={17} />}>
          {props.successMessage}
        </AlertMessage>
      )}
      {props.usersError && <AlertMessage type="error">{props.usersError}</AlertMessage>}

      <UserListTable {...props} />

      <Pagination
        entityLabel="usuários"
        visibleStart={props.visibleStart}
        visibleEnd={props.visibleEnd}
        totalItems={props.usersTotalItems}
        currentPage={props.currentPage}
        totalPages={props.totalPages}
        onPageChange={props.onPageChange}
      />
    </DataPanel>
  );
}
