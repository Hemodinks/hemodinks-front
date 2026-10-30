import { useRef, useState } from 'react';
import type { PacienteExportFormat, PacienteExportScope, PacienteFilters } from '../../appTypes';
import { getPacientes } from '../../services';
import { sessionEpoch } from '../../services/sessionEpoch';
import { getErrorMessage, PATIENT_EXPORT_PAGE_SIZE } from '../../shared/utils/formatters';
import { collectConsistentPages } from '../../shared/utils/collectConsistentPages';
import { useExportScope } from '../../shared/hooks/useExportScope';
import type { AuthSession, Paciente } from '../../types';
import { exportPatientList } from './export/patientListExporter';
import { getPacienteFilterQuery } from './patientUtils';
import { getSurgeryTypeLabel } from '../../shared/surgeryType';

type UsePatientExportOptions = {
  session: AuthSession | null;
  companyName: string;
  paginatedPacientes: Paciente[];
  pacienteFilters: PacienteFilters;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  setPacientesError: (message: string) => void;
};

export function usePatientExport({
  session,
  companyName,
  paginatedPacientes,
  pacienteFilters,
  sortBy,
  sortDirection,
  setPacientesError,
}: UsePatientExportOptions) {
  const [pacienteExportLoading, setPacienteExportLoading] = useState<PacienteExportFormat | null>(null);
  const [pacienteExportScope, setPacienteExportScope] = useState<PacienteExportScope>('visible');
  const exportInFlight = useRef(false);
  const scope = useExportScope([session?.token, session?.user.clinicaId, session?.user.perfilId, companyName,
    JSON.stringify(pacienteFilters), sortBy, sortDirection, pacienteExportScope,
    pacienteExportScope === 'visible' ? JSON.stringify(paginatedPacientes) : null]);

  const fetchPacientesForExport = async (query: NonNullable<Parameters<typeof getPacientes>[1]>, shouldContinue: () => boolean) => {
    if (!session) {
      return [];
    }

    return collectConsistentPages(page => getPacientes(session.token, {
      page,
      pageSize: PATIENT_EXPORT_PAGE_SIZE,
      sortBy: sortBy || 'data',
      sortDirection,
      ...query,
    }), shouldContinue);
  };

  const loadPacientesForExport = async (selection: PacienteExportScope, shouldContinue: () => boolean) => {
    if (selection === 'visible') {
      return paginatedPacientes;
    }

    if (selection === 'doctor') {
      if (!pacienteFilters.medicoUserIds.length) {
        throw new Error('Selecione ao menos um cirurgião antes de exportar por cirurgião.');
      }

      return fetchPacientesForExport(getPacienteFilterQuery(pacienteFilters), shouldContinue);
    }

    const { dataInicio, dataFinal, tipoCirurgia } = getPacienteFilterQuery(pacienteFilters);
    return fetchPacientesForExport({ dataInicio, dataFinal, tipoCirurgia }, shouldContinue);
  };

  const handleExportPacientes = async (format: PacienteExportFormat) => {
    if (!session || exportInFlight.current) {
      return;
    }

    exportInFlight.current = true;
    const epoch = sessionEpoch();
    const isScopeCurrent = scope.capture();
    const shouldContinue = () => epoch === sessionEpoch() && isScopeCurrent();
    setPacienteExportLoading(format);
    setPacientesError('');

    try {
      const exportItems = await loadPacientesForExport(pacienteExportScope, shouldContinue);
      if (!shouldContinue()) return;
      const period = [pacienteFilters.dataInicio, pacienteFilters.dataFinal].filter(Boolean).join(' a ');
      const scopeLabel = pacienteExportScope === 'all'
        ? 'Todos os pacientes'
        : pacienteExportScope === 'doctor' ? 'Cirurgiões selecionados' : 'Dados da tela';
      await exportPatientList({
        format,
        items: exportItems,
        companyName,
        sessionToken: session.token,
        shouldContinue,
        contextLines: [scopeLabel, period ? `Período: ${period}` : 'Período: todos', ...(pacienteFilters.tipoCirurgia ? [`Tipo de cirurgia: ${getSurgeryTypeLabel(pacienteFilters.tipoCirurgia)}`] : [])],
      });
    } catch (error) {
      if (shouldContinue()) setPacientesError(getErrorMessage(error));
    } finally {
      exportInFlight.current = false;
      if (scope.isMounted() && epoch === sessionEpoch()) setPacienteExportLoading(null);
    }
  };

  return {
    pacienteExportLoading,
    pacienteExportScope,
    setPacienteExportScope,
    handleExportPacientes,
  };
}
