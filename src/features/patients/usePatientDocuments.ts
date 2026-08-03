import { downloadPacienteArquivo, getPacienteFinanceiroResumo } from '../../services';

export function usePatientDocuments(sessionToken: string) {
  return {
    download: (pacienteId: number, arquivoId: number) =>
      downloadPacienteArquivo(pacienteId, arquivoId, sessionToken),
    getFinancialSummary: (pacienteId: number) =>
      getPacienteFinanceiroResumo(pacienteId, sessionToken),
  };
}
