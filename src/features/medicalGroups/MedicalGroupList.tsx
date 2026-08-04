import { CheckCircle2, ChevronLeft, ChevronRight, CircleCheck, CircleX, Pencil, Plus, RefreshCw, ShieldPlus, Trash2 } from 'lucide-react';
import type { MedicalGroup } from '../../types';
import { AlertMessage, Button, DataPanel, IconButton, SearchField } from '../../shared/components/ui';
import { scrollListCarousel } from '../../shared/utils/carousel';

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
      <div className="data-header">
        <div>
          <span className="eyebrow">Equipes médicas</span>
          <h2>{totalItems} grupos cadastrados</h2>
        </div>

        <div className="table-tools">
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
        </div>
      </div>

      {successMessage && <AlertMessage type="success" icon={<CheckCircle2 size={17} />}>{successMessage}</AlertMessage>}
      {groupsError && <AlertMessage type="error">{groupsError}</AlertMessage>}

      <div className="carousel-shell">
        <button
          type="button"
          className="carousel-nav carousel-nav-left"
          onClick={(event) => scrollListCarousel(event, 'previous')}
          aria-label="Voltar no carrossel de grupos médicos"
          title="Voltar no carrossel"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="table-wrap list-carousel-wrap">
          <table className="users-table medical-groups-table">
            <thead>
              <tr>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('nome')} aria-sort={sortBy === 'nome' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Grupo
                    {sortBy === 'nome' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('membros')} aria-sort={sortBy === 'membros' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Médicos
                    {sortBy === 'membros' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>
                  <button type="button" className="sort-header-button" onClick={() => onSortChange('ativo')} aria-sort={sortBy === 'ativo' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    Status
                    {sortBy === 'ativo' && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th>Membros</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {groupsLoading ? (
                <tr>
                  <td colSpan={5} className="empty-row">Carregando grupos médicos...</td>
                </tr>
              ) : groups.length ? (
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
              ) : (
                <tr>
                  <td colSpan={5} className="empty-row">Nenhum grupo médico encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="carousel-nav carousel-nav-right"
          onClick={(event) => scrollListCarousel(event, 'next')}
          aria-label="Avançar no carrossel de grupos médicos"
          title="Avançar no carrossel"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="pagination-bar">
        <span>
          {visibleStart}-{visibleEnd} de {totalItems}
        </span>
        <div className="pagination-actions">
          <IconButton
            label="Página anterior de grupos médicos"
            onClick={() => onPageChange((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            title="Página anterior"
          >
            <ChevronLeft size={18} />
          </IconButton>
          <span className="page-indicator">Página {currentPage} de {totalPages}</span>
          <IconButton
            label="Próxima página de grupos médicos"
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
