import { useState } from 'react';
import type { PacienteExportFormat, PacienteExportScope, PacienteFilters } from '../../appTypes';
import { getPacientes } from '../../services';
import { getErrorMessage, PATIENT_EXPORT_PAGE_SIZE } from '../../shared/utils/formatters';
import { getPagedItems, getPagedTotalPages, sortPacientesForListing } from '../../shared/utils/listing';
import type { AuthSession, Paciente } from '../../types';
import { exportPatientList } from './export/patientListExporter';
import { getPacienteFilterQuery } from './patientUtils';

type UsePatientExportOptions = {
  session: AuthSession | null;
  companyName: string;
  paginatedPacientes: Paciente[];
  pacienteFilters: PacienteFilters;
  setPacientesError: (message: string) => void;
};

export function usePatientExport({
  session,
  companyName,
  paginatedPacientes,
  pacienteFilters,
  setPacientesError,
}: UsePatientExportOptions) {
  const [pacienteExportLoading, setPacienteExportLoading] = useState<PacienteExportFormat | null>(null);
  const [pacienteExportScope, setPacienteExportScope] = useState<PacienteExportScope>('visible');

  const fetchPacientesForExport = async (query: NonNullable<Parameters<typeof getPacientes>[1]>) => {
    if (!session) {
      return [];
    }

    const firstResult = await getPacientes(session.token, {
      page: 1,
      pageSize: PATIENT_EXPORT_PAGE_SIZE,
      ...query,
    });

    const items = [...getPagedItems(firstResult)];
    const totalPagesForExport = getPagedTotalPages(firstResult);

    for (let page = 2; page <= totalPagesForExport; page += 1) {
      const result = await getPacientes(session.token, {
        ...query,
        page,
        pageSize: PATIENT_EXPORT_PAGE_SIZE,
      });
      items.push(...getPagedItems(result));
    }

    return sortPacientesForListing(items);
  };

  const loadPacientesForExport = async (scope: PacienteExportScope) => {
    if (scope === 'visible') {
      return paginatedPacientes;
    }

    if (scope === 'doctor') {
      if (!pacienteFilters.medicoUserIds.length) {
        throw new Error('Selecione ao menos um cirurgião antes de exportar por cirurgião.');
      }

      return fetchPacientesForExport(getPacienteFilterQuery(pacienteFilters));
    }

    const { dataInicio, dataFinal } = getPacienteFilterQuery(pacienteFilters);
    return fetchPacientesForExport({ dataInicio, dataFinal });
  };

  const handleExportPacientes = async (format: PacienteExportFormat) => {
    if (!session || pacienteExportLoading) {
      return;
    }

    setPacienteExportLoading(format);
    setPacientesError('');

    try {
      const exportItems = await loadPacientesForExport(pacienteExportScope);
      const period = [pacienteFilters.dataInicio, pacienteFilters.dataFinal].filter(Boolean).join(' a ');
      const scopeLabel = pacienteExportScope === 'all'
        ? 'Todos os pacientes'
        : pacienteExportScope === 'doctor' ? 'Cirurgiões selecionados' : 'Dados da tela';
      await exportPatientList({
        format,
        items: exportItems,
        companyName,
        sessionToken: session.token,
        contextLines: [scopeLabel, period ? `Período: ${period}` : 'Período: todos'],
      });
    } catch (error) {
      setPacientesError(getErrorMessage(error));
    } finally {
      setPacienteExportLoading(null);
    }
  };

  return {
    pacienteExportLoading,
    pacienteExportScope,
    setPacienteExportScope,
    handleExportPacientes,
  };
}
