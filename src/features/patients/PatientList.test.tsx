import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { basePaciente } from '../../test/appTestData';
import { PatientList } from './PatientList';
import type { PatientListProps } from './patientListTypes';
import { emptyPacienteFilters } from './patientUtils';

function props(overrides: Partial<PatientListProps> = {}): PatientListProps {
  return {
    pacientes: [basePaciente], pacientesLoading: false, pacientesError: '', pacienteSuccessMessage: '',
    pacientesTotalItems: 21, pacienteVisibleStart: 1, pacienteVisibleEnd: 10, pacienteCurrentPage: 1, pacienteTotalPages: 3,
    pacienteSearchTerm: '', sortBy: '', sortDirection: 'desc', pacienteFilters: emptyPacienteFilters,
    pacienteExportLoading: null, pacienteExportScope: 'visible', sessionToken: 'clinic-token',
    canCreatePatients: true, canEditPatients: true, canDeletePatients: true, canManageObservacoes: true,
    patientReadOnly: false, isAdmin: true, isTeam: false, medicalUsers: [], convenios: [],
    onSearchChange: vi.fn(), onFiltersChange: vi.fn(), onClearFilters: vi.fn(), onExportScopeChange: vi.fn(),
    onPageChange: vi.fn(), onSortChange: vi.fn(), onRefresh: vi.fn(), onOpenNewPacienteForm: vi.fn(),
    onExportPacientes: vi.fn(), onEditPaciente: vi.fn(), onDeletePaciente: vi.fn(), onReativarPaciente: vi.fn(), onOpenPacienteFiles: vi.fn(),
    onOpenPacienteObservacoes: vi.fn(), onSelectPatientInfo: vi.fn(), ...overrides,
  };
}

describe('listagem de pacientes', () => {
  it('mantém Editar e Inativar na célula imediatamente após o nome, com tooltip e ações diretas', async () => {
    const state = props();
    render(<PatientList {...state} />);
    const cells = within(screen.getByText('Paciente Hemodinks').closest('tr')!).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('Paciente Hemodinks');
    const edit = within(cells[1]).getByRole('button', { name: 'Editar Paciente Hemodinks' });
    expect(edit).toHaveAttribute('title', 'Editar');
    await userEvent.click(edit);
    const inactivate = within(cells[1]).getByRole('button', { name: 'Inativar Paciente Hemodinks' });
    expect(inactivate).toHaveAttribute('title', 'Inativar');
    await userEvent.click(inactivate);
    expect(state.onEditPaciente).toHaveBeenCalledWith(basePaciente);
    expect(state.onDeletePaciente).toHaveBeenCalledWith(basePaciente);
  });

  it('preserva visualização sem oferecer criação, edição ou exclusão sem permissão', () => {
    render(<PatientList {...props({ canCreatePatients: false, canEditPatients: false, canDeletePatients: false, patientReadOnly: true })} />);
    expect(screen.getByRole('button', { name: 'Visualizar Paciente Hemodinks' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Editar|Inativar|Reativar|Novo paciente/ })).not.toBeInTheDocument();
  });

  it('paciente inativado mostra selo e oferece Reativar em vez de Inativar ao administrador', async () => {
    const inactive = { ...basePaciente, inativado: true, inativadoEm: '2026-11-23T15:00:00Z' };
    const state = props({ pacientes: [inactive] });
    render(<PatientList {...state} />);
    const row = screen.getByText('Paciente Hemodinks').closest('tr')!;
    expect(within(row).getByText('Inativo')).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Inativar Paciente Hemodinks' })).not.toBeInTheDocument();
    await userEvent.click(within(row).getByRole('button', { name: 'Reativar Paciente Hemodinks' }));
    expect(state.onReativarPaciente).toHaveBeenCalledWith(inactive);
    expect(state.onDeletePaciente).not.toHaveBeenCalled();
  });

  it('filtro de situação do cadastro aparece só para administrador', async () => {
    const state = props();
    const { unmount } = render(<PatientList {...state} />);
    const situacao = screen.getByRole('combobox', { name: 'Situação do cadastro' });
    expect(situacao).toHaveValue('ativos');
    await userEvent.selectOptions(situacao, 'inativos');
    const update = vi.mocked(state.onFiltersChange).mock.calls.at(-1)![0] as (current: typeof emptyPacienteFilters) => typeof emptyPacienteFilters;
    expect(update(emptyPacienteFilters).situacao).toBe('inativos');
    unmount();
    render(<PatientList {...props({ isAdmin: false })} />);
    expect(screen.queryByRole('combobox', { name: 'Situação do cadastro' })).not.toBeInTheDocument();
  });

  it('bloqueia paginação, atualização e exportações enquanto carrega', () => {
    render(<PatientList {...props({ pacientesLoading: true })} />);
    expect(screen.getByText('Carregando pacientes...')).toHaveAttribute('role', 'status');
    for (const name of ['Exportar PDF', 'Exportar Planilha', 'Próxima página de pacientes', 'Atualizar lista de pacientes']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });

  it('anuncia exportação, bloqueia os dois formatos e a mudança de escopo', () => {
    render(<PatientList {...props({ pacienteExportLoading: 'pdf' })} />);
    const group = screen.getByRole('group', { name: 'Exportações da listagem' });
    expect(within(group).getByRole('status')).toHaveTextContent('Gerando PDF da listagem');
    for (const button of within(group).getAllByRole('button')) expect(button).toBeDisabled();
    expect(within(group).getByRole('combobox')).toBeDisabled();
  });

  it('preserva filtros, limpar, exportação e paginação sem alterar seus callbacks', async () => {
    const state = props();
    render(<PatientList {...state} />);
    await userEvent.type(screen.getByLabelText('Buscar pacientes'), 'A');
    expect(state.onSearchChange).toHaveBeenCalledWith('A');
    await userEvent.click(screen.getByLabelText('Filtros de pacientes', { selector: 'summary' }));
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(state.onClearFilters).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));
    await userEvent.click(screen.getByRole('button', { name: 'Exportar Planilha' }));
    expect(vi.mocked(state.onExportPacientes).mock.calls).toEqual([['pdf'], ['xlsx']]);
    expect(screen.getByRole('button', { name: 'Página anterior de pacientes' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página de pacientes' }));
    expect(state.onPageChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it('exibe erro e resultado vazio com feedback acessível', () => {
    render(<PatientList {...props({ pacientes: [], pacientesError: 'Falha ao carregar pacientes.' })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao carregar pacientes.');
    expect(screen.getByText('Nenhum paciente encontrado.')).toHaveAttribute('role', 'status');
  });
});
