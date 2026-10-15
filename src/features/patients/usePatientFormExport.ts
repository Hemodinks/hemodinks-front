import { useState } from 'react';
import type { PacienteExportFormat } from '../../appTypes';
import { getPacienteObservacoes } from '../../services';
import { sessionEpoch } from '../../services/sessionEpoch';
import { getErrorMessage } from '../../shared/utils/formatters';
import type { PacienteFormData, PacienteObservacao } from '../../types';
import { exportPatientForm } from './export/patientFormExporter';

type UsePatientFormExportOptions = {
  editingPacienteId: number | null;
  sessionToken: string;
  pacienteFormData: PacienteFormData;
  companyName: string;
};

export function usePatientFormExport({
  editingPacienteId,
  sessionToken,
  pacienteFormData,
  companyName,
}: UsePatientFormExportOptions) {
  const [exportLoading, setExportLoading] = useState<PacienteExportFormat | null>(null);
  const [exportError, setExportError] = useState('');

  const handleExport = async (format: PacienteExportFormat) => {
    if (exportLoading) return;
    const epoch = sessionEpoch();

    setExportLoading(format);
    setExportError('');
    try {
      let observations: PacienteObservacao[] = [];
      if (format === 'pdf' && editingPacienteId && sessionToken) {
        try {
          observations = await getPacienteObservacoes(editingPacienteId, sessionToken);
        } catch {
          // Observations enrich the PDF but must not block exporting form data.
        }
      }
      if (epoch !== sessionEpoch()) return;
      await exportPatientForm({ format, formData: pacienteFormData, companyName, sessionToken, observations });
    } catch (error) {
      if (epoch === sessionEpoch()) setExportError(getErrorMessage(error));
    } finally {
      if (epoch === sessionEpoch()) setExportLoading(null);
    }
  };

  return { exportLoading, exportError, handleExport };
}
