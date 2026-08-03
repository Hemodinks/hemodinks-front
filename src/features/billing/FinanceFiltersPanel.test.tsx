import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { FinanceFiltersState } from './billingPageTypes';
import { FinanceFiltersPanel } from './FinanceFiltersPanel';

const initialFilters: FinanceFiltersState = {
  competencia: '',
  vencimentoInicio: '',
  vencimentoFim: '',
  convenioId: '',
  medicoId: '',
  pacienteId: '',
  status: '',
  termo: '',
};

function FiltersHarness({ onApplyFilters = vi.fn(), loading = false }) {
  const [filters, setFilters] = useState(initialFilters);
  return (
    <FinanceFiltersPanel
      filters={filters}
      convenios={[{ idConvenio: 2, descricaoConvenio: 'Saúde Plus' } as never]}
      medicalUsers={[{ id: 3, nome: 'maria silva', email: 'maria@example.com' }]}
      pacientes={[{ id: 4, nomePaciente: 'joão souza' } as never]}
      loading={loading}
      setFilters={setFilters}
      onApplyFilters={onApplyFilters}
    />
  );
}

describe('FinanceFiltersPanel', () => {
  it('atualiza todos os filtros e aplica a primeira página', () => {
    const onApplyFilters = vi.fn();
    render(<FiltersHarness onApplyFilters={onApplyFilters} />);

    fireEvent.change(screen.getByLabelText('Buscar por documento ou paciente'), {
      target: { value: 'FAT-10' },
    });
    fireEvent.change(screen.getByLabelText('Competência'), { target: { value: '2026-07' } });
    fireEvent.change(screen.getByLabelText('Vencimento inicial'), {
      target: { value: '2026-07-01' },
    });
    fireEvent.change(screen.getByLabelText('Vencimento final'), {
      target: { value: '2026-07-31' },
    });
    fireEvent.change(screen.getByLabelText('Convênio'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Médico'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Paciente'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Recebido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    expect(screen.getByLabelText('Buscar por documento ou paciente')).toHaveValue('FAT-10');
    expect(screen.getByRole('option', { name: 'Maria Silva' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'João Souza' })).toBeInTheDocument();
    expect(onApplyFilters).toHaveBeenCalledWith(1);
  });

  it('desabilita a aplicação durante o carregamento', () => {
    render(<FiltersHarness loading />);
    expect(screen.getByRole('button', { name: 'Aplicar filtros' })).toBeDisabled();
  });
});
