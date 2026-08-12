import { createReportXlsxBlob } from '../../../shared/export/xlsxReport';
import type { PatientExportRow } from './patientExportData';

export function createXlsxBlob(rows: PatientExportRow[], headers: readonly string[], sheetName = 'Pacientes') {
  return createReportXlsxBlob(rows, headers, { sheetName });
}
