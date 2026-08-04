import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { MedicalGroup, MedicalGroupFormData } from './medicalGroupTypes';
import { MedicalGroupsPage } from './MedicalGroupsPage';

const group: MedicalGroup = {
  id: 7,
  nome: 'Equipe vascular',
  ativo: true,
  dataCadastro: '2026-07-01T00:00:00Z',
  membrosCount: 2,
  membros: [
    { userId: 2, nome: 'bruno hemodinks', email: 'bruno@hemodinks.com' },
    { userId: 1, nome: 'ana hemodinks', email: 'ana@hemodinks.com' },
  ],
};

describe('MedicalGroupsPage', () => {
  it('renderiza a lista e encaminha busca, ordenação e ações', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const onSortChange = vi.fn();
    const onEditGroup = vi.fn();
    const onDeleteGroup = vi.fn();

    render(
      <MedicalGroupsPage
        moduleMode="list"
        groups={[group]}
        groupsLoading={false}
        groupsError=""
        successMessage="Grupo salvo."
        totalItems={1}
        visibleStart={1}
        visibleEnd={1}
        currentPage={1}
        totalPages={1}
        searchTerm=""
        sortBy="recent"
        sortDirection="desc"
        editingGroupId={null}
        formData={{ nome: '', ativo: true, medicoUserIds: [] }}
        formError=""
        formLoading={false}
        availableMedicalUsers={[]}
        setFormData={vi.fn()}
        setSearchTerm={onSearchChange}
        setCurrentPage={vi.fn()}
        onSortChange={onSortChange}
        onCloseForm={vi.fn()}
        onOpenNewForm={vi.fn()}
        onSubmit={vi.fn()}
        onEditGroup={onEditGroup}
        onDeleteGroup={onDeleteGroup}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText('Grupo salvo.')).toBeInTheDocument();
    expect(screen.getByText('Bruno Hemodinks, Ana Hemodinks')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar grupos médicos'), {
      target: { value: 'vascular' },
    });
    expect(onSearchChange).toHaveBeenLastCalledWith('vascular');
    await user.click(screen.getByRole('button', { name: 'Grupo' }));
    expect(onSortChange).toHaveBeenCalledWith('nome');
    await user.click(screen.getByRole('button', { name: 'Membros' }));
    await user.click(screen.getByRole('button', { name: 'Editar Equipe vascular' }));
    await user.click(screen.getByRole('button', { name: 'Excluir Equipe vascular' }));
    expect(onEditGroup).toHaveBeenCalledWith(group);
    expect(onDeleteGroup).toHaveBeenCalledWith(group);
  });

  it('permite editar dados e membros no formulário', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    function Harness() {
      const [formData, setFormData] = useState<MedicalGroupFormData>({
        nome: 'Equipe vascular',
        ativo: true,
        medicoUserIds: [1],
      });
      return (
        <MedicalGroupsPage
          moduleMode="form"
          groups={[]}
          groupsLoading={false}
          groupsError=""
          successMessage=""
          totalItems={0}
          visibleStart={0}
          visibleEnd={0}
          currentPage={1}
          totalPages={1}
          searchTerm=""
          sortBy="recent"
          sortDirection="desc"
          editingGroupId={7}
          formData={formData}
          formError=""
          formLoading={false}
          availableMedicalUsers={[
            { id: 1, nome: 'Ana Hemodinks', email: 'ana@hemodinks.com' },
            { id: 2, nome: 'Bruno Hemodinks', email: 'bruno@hemodinks.com' },
          ]}
          setFormData={setFormData}
          setSearchTerm={vi.fn()}
          setCurrentPage={vi.fn()}
          onSortChange={vi.fn()}
          onCloseForm={vi.fn()}
          onOpenNewForm={vi.fn()}
          onSubmit={onSubmit}
          onEditGroup={vi.fn()}
          onDeleteGroup={vi.fn()}
          onRefresh={vi.fn()}
        />
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole('checkbox', { name: /bruno hemodinks/i }));
    expect(screen.getByText('2 selecionados')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar grupo médico' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
