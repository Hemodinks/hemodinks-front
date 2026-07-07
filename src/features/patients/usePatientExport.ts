import { useState } from 'react';
import type { PacienteExportFormat, PacienteExportScope, PacienteFilters } from '../../appTypes';
import { getPacientes } from '../../services';
import { getErrorMessage, PATIENT_EXPORT_PAGE_SIZE } from '../../shared/utils/formatters';
import { getPagedItems, getPagedTotalPages, sortPacientesForListing } from '../../shared/utils/listing';
import type { AuthSession, Paciente } from '../../types';
import {
  createXlsxBlob,
  downloadBlob,
  getPacienteExportRows,
  getPatientExportFileName,
  pacienteExportColumns,
} from './patientExport';

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
      const medico = pacienteFilters.medico.trim();

      if (!medico) {
        throw new Error('Selecione um cirurgião antes de exportar por cirurgião.');
      }

      return fetchPacientesForExport({ medico });
    }

    return fetchPacientesForExport({});
  };

  const handleExportPacientes = async (format: PacienteExportFormat) => {
    if (!session || pacienteExportLoading) {
      return;
    }

    setPacienteExportLoading(format);
    setPacientesError('');

    try {
      const exportItems = await loadPacientesForExport(pacienteExportScope);
      const rows = getPacienteExportRows(exportItems);

      if (format === 'xlsx') {
        downloadBlob(createXlsxBlob(rows), getPatientExportFileName('xlsx', companyName));
        return;
      }

      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const autoTable = autoTableModule.default;
      const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      document.setFontSize(14);
      document.text(`Cadastro de pacientes - ${companyName}`, 40, 34);
      document.setFontSize(9);
      document.text(`Gerado em ${new Intl.DateTimeFormat('pt-BR').format(new Date())}`, 40, 50);
      autoTable(document, {
        head: [pacienteExportColumns.map((column) => column.header)],
        body: exportItems.map((paciente) => pacienteExportColumns.map((column) => column.getValue(paciente))),
        startY: 64,
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 50 },
          7: { cellWidth: 40 },
          9: { cellWidth: 100 },
          15: { cellWidth: 35 },
        },
        styles: {
          fontSize: 6.6,
          cellPadding: 3,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [15, 118, 110],
          textColor: 255,
        },
        margin: { left: 24, right: 24 },
      });
      document.save(getPatientExportFileName('pdf', companyName));
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
