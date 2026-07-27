import { CheckCircle2, CircleCheck, CircleX, Pencil, Plus, RefreshCw, ShieldPlus, Trash2 } from 'lucide-react';
import type { MedicalGroup } from '../../types';
import { AlertMessage, Button, DataPanel, IconButton, SearchField } from '../../shared/components/ui';
import {
  HorizontalTableScroller,
  ListToolbar,
  Pagination,
  SortableHeader,
  TableStateRow,
} from '../../shared/components/listing';

type MedicalGroupListProps = {
  groups: MedicalGroup[];
  groupsLoading: boolean;
  groupsError: string;
  successMessage: string;
  totalItems: number;
  visibleStart: number;
  visibleEnd: number;
  currentPage: number;
  totalPages: number;
  searchTerm: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSearchChange: (value: string) => void;
  onPageChange: (page: number | ((current: number) => number)) => void;
  onSortChange: (field: string) => void;
  onOpenNewForm: () => void;
  onEditGroup: (group: MedicalGroup) => void | Promise<void>;
  onDeleteGroup: (group: MedicalGroup) => void | Promise<void>;
  onRefresh: () => void;
};

export function MedicalGroupList({
  groups,
  groupsLoading,
  groupsError,
  successMessage,
  totalItems,
  visibleStart,
  visibleEnd,
  currentPage,
  totalPages,
  searchTerm,
  sortBy,
  sortDirection,
  onSearchChange,
  onPageChange,
  onSortChange,
  onOpenNewForm,
  onEditGroup,
  onDeleteGroup,
  onRefresh,
}: MedicalGroupListProps) {
  return (
    <DataPanel>
      <ListToolbar eyebrow="Equipes médicas" title={`${totalItems} grupos cadastrados`}>
          <Button onClick={onOpenNewForm}>
            <Plus size={17} />
            Novo grupo médico
          </Button>
          <SearchField
            label="Buscar grupos médicos"
            value={searchTerm}
            onValueChange={onSearchChange}
          />
          <IconButton label="Atualizar lista de grupos médicos" onClick={onRefresh} title="Atualizar lista">
            <RefreshCw size={18} />
          </IconButton>
      </ListToolbar>

      {successMessage && <AlertMessage type="success" icon={<CheckCircle2 size={17} />}>{successMessage}</AlertMessage>}
      {groupsError && <AlertMessage type="error">{groupsError}</AlertMessage>}

      <HorizontalTableScroller entityLabel="grupos médicos">
          <table className="users-table medical-groups-table">
            <thead>
              <tr>
                <SortableHeader field="nome" label="Grupo" sortBy={sortBy} sortDirection={sortDirection} onSortChange={onSortChange} />
                <SortableHeader field="membros" label="Médicos" sortBy={sortBy} sortDirection={sortDirection} onSortChange={onSortChange} />
                <SortableHeader field="ativo" label="Status" sortBy={sortBy} sortDirection={sortDirection} onSortChange={onSortChange} />
                <th>Membros</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {groupsLoading || !groups.length ? (
                <TableStateRow
                  colSpan={5}
                  loading={groupsLoading}
                  empty={!groups.length}
                  loadingLabel="Carregando grupos médicos..."
                  emptyLabel="Nenhum grupo médico encontrado."
                />
              ) : (
                groups.map((group) => (
                  <tr key={group.id}>
                    <td data-label="Grupo">
                      <div className="name-cell">
                        <span className="status-info-button medical-group-icon" aria-hidden="true">
                          <ShieldPlus size={17} />
                        </span>
                        <span>{group.nome}</span>
                      </div>
                    </td>
                    <td data-label="Médicos">{group.membrosCount}</td>
                    <td data-label="Status">
                      <span className={`status-pill ${group.ativo ? 'ok' : 'warning'}`}>
                        {group.ativo ? <CircleCheck size={14} /> : <CircleX size={14} />}
                        {group.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td data-label="Membros">
                      <span className="medical-group-members-preview">
                        {group.membros.length ? group.membros.map((member) => member.nome).join(', ') : '-'}
                      </span>
                    </td>
                    <td data-label="Ações">
                      <div className="row-actions">
                        <IconButton label={`Editar ${group.nome}`} tone="muted" onClick={() => void onEditGroup(group)} title="Editar">
                          <Pencil size={17} />
                        </IconButton>
                        <IconButton label={`Excluir ${group.nome}`} tone="danger" onClick={() => void onDeleteGroup(group)} title="Excluir">
                          <Trash2 size={17} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </HorizontalTableScroller>

      <Pagination
        entityLabel="grupos médicos"
        visibleStart={visibleStart}
        visibleEnd={visibleEnd}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </DataPanel>
  );
}
