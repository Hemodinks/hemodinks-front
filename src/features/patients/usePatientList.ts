import { useCallback, useState } from 'react';
import type { PacienteFilters } from '../../appTypes';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { emptyPacienteFilters } from './patientUtils';

function arePacienteFiltersEqual(current: PacienteFilters, debounced: PacienteFilters) {
  return (
    current.medico === debounced.medico &&
    current.convenio === debounced.convenio &&
    current.procedimento === debounced.procedimento
  );
}

export function usePatientList() {
  const [pacientesError, setPacientesError] = useState('');
  const [pacienteSuccessMessage, setPacienteSuccessMessage] = useState('');
  const [pacienteSearchTerm, setPacienteSearchTerm] = useState('');
  const [pacienteFilters, setPacienteFilters] = useState<PacienteFilters>(emptyPacienteFilters);
  const [pacienteCurrentPage, setPacienteCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('recent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const resetPacientesPage = useCallback(() => setPacienteCurrentPage(1), []);
  const [debouncedPacienteSearchTerm] = useDebouncedValue(pacienteSearchTerm, {
    onCommit: resetPacientesPage,
  });
  const [debouncedPacienteFilters, setDebouncedPacienteFilters] = useDebouncedValue(
    pacienteFilters,
    {
      isEqual: arePacienteFiltersEqual,
      onCommit: resetPacientesPage,
    },
  );
  const resetPatientListState = () => {
    setPacientesError('');
    setPacienteSuccessMessage('');
    setPacienteSearchTerm('');
    setPacienteFilters(emptyPacienteFilters);
    setDebouncedPacienteFilters(emptyPacienteFilters);
    setPacienteCurrentPage(1);
    setSortBy('recent');
    setSortDirection('desc');
  };

  return {
    pacientesError,
    setPacientesError,
    pacienteSuccessMessage,
    setPacienteSuccessMessage,
    pacienteSearchTerm,
    setPacienteSearchTerm,
    pacienteFilters,
    setPacienteFilters,
    debouncedPacienteSearchTerm,
    debouncedPacienteFilters,
    setDebouncedPacienteFilters,
    pacienteCurrentPage,
    setPacienteCurrentPage,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    resetPatientListState,
  };
}
