import { useCallback, useState } from 'react';
import type { PacienteFilters } from '../../appTypes';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { PAGE_SIZE } from '../../shared/utils/formatters';
import type { Paciente } from '../../types';
import { emptyPacienteFilters } from './patientUtils';

function arePacienteFiltersEqual(current: PacienteFilters, debounced: PacienteFilters) {
  return current.medico === debounced.medico
    && current.convenio === debounced.convenio
    && current.procedimento === debounced.procedimento;
}

export function usePatientList() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacientesLoading, setPacientesLoading] = useState(false);
  const [pacientesError, setPacientesError] = useState('');
  const [pacienteSuccessMessage, setPacienteSuccessMessage] = useState('');
  const [pacienteSearchTerm, setPacienteSearchTerm] = useState('');
  const [pacienteFilters, setPacienteFilters] = useState<PacienteFilters>(emptyPacienteFilters);
  const [pacienteCurrentPage, setPacienteCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('recent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const resetPacientesPage = useCallback(() => setPacienteCurrentPage(1), []);
  const [debouncedPacienteSearchTerm] = useDebouncedValue(pacienteSearchTerm, { onCommit: resetPacientesPage });
  const [debouncedPacienteFilters, setDebouncedPacienteFilters] = useDebouncedValue(pacienteFilters, {
    isEqual: arePacienteFiltersEqual,
    onCommit: resetPacientesPage,
  });
  const [pacientesTotalItems, setPacientesTotalItems] = useState(0);
  const [pacientesTotalPages, setPacientesTotalPages] = useState(1);

  const pacienteTotalPages = Math.max(1, pacientesTotalPages);
  const pacientePageStart = (pacienteCurrentPage - 1) * PAGE_SIZE;
  const pacientePageEnd = pacientePageStart + PAGE_SIZE;
  const paginatedPacientes = pacientes;
  const pacienteVisibleStart = pacientesTotalItems ? pacientePageStart + 1 : 0;
  const pacienteVisibleEnd = Math.min(pacientePageEnd, pacientesTotalItems);

  const resetPatientListState = () => {
    setPacientes([]);
    setPacientesError('');
    setPacienteSuccessMessage('');
    setPacienteSearchTerm('');
    setPacienteFilters(emptyPacienteFilters);
    setDebouncedPacienteFilters(emptyPacienteFilters);
    setPacienteCurrentPage(1);
    setPacientesTotalItems(0);
    setPacientesTotalPages(1);
    setSortBy('recent');
    setSortDirection('desc');
  };

  return {
    pacientes,
    setPacientes,
    pacientesLoading,
    setPacientesLoading,
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
    pacientesTotalItems,
    setPacientesTotalItems,
    pacientesTotalPages,
    setPacientesTotalPages,
    pacienteTotalPages,
    paginatedPacientes,
    pacienteVisibleStart,
    pacienteVisibleEnd,
    resetPatientListState,
  };
}
