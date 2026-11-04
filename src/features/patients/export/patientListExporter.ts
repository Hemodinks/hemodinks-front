import type { Paciente } from '../../../types';
import { sessionEpoch } from '../../../services/sessionEpoch';
import type { PacienteExportFormat } from '../../../appTypes';
import { downloadBlob } from '../../../shared/utils/downloadFile';
import { addPdfReportFooters, getPdfReportPageHooks, getPdfReportTableStyles, PDF_REPORT_BODY_START } from '../../../shared/export/pdfReport';
import { normalizeReportValue, resolveReportIdentity, type ReportIdentity } from '../../../shared/export/reportIdentity';
import { createReportXlsxBlob } from '../../../shared/export/xlsxReport';
import {
  getPacienteExportRows,
  getPatientExportFileName,
  pacienteExportColumns,
} from './patientExportData';

type ExportPatientListOptions = {
  format: PacienteExportFormat;
  items: Paciente[];
  companyName: string;
  sessionToken?: string;
  contextLines?: string[];
  shouldContinue?: () => boolean;
};

async function createPatientListPdf(items: Paciente[], identity: ReportIdentity) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  autoTableModule.default(document, {
    head: [pacienteExportColumns.map((column) => column.header)],
    body: items.map((paciente) => pacienteExportColumns.map((column) => normalizeReportValue(column.getValue(paciente)))),
    startY: PDF_REPORT_BODY_START,
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 50, halign: 'center' },
      7: { cellWidth: 40 },
      9: { cellWidth: 100 },
      15: { cellWidth: 35 },
    },
    ...getPdfReportTableStyles(identity),
    styles: { ...getPdfReportTableStyles(identity).styles, fontSize: 6.5, cellPadding: 3 },
    ...getPdfReportPageHooks(document, identity),
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
  });
  addPdfReportFooters(document, identity);
  return document;
}

export async function exportPatientList({ format, items: sourceItems, companyName, sessionToken, contextLines, shouldContinue }: ExportPatientListOptions) {
  const items = structuredClone(sourceItems);
  const epoch = sessionEpoch();
  const isCurrent = () => epoch === sessionEpoch() && (shouldContinue?.() ?? true);
  const fileName = getPatientExportFileName(format, companyName);
  const identity = await resolveReportIdentity({
    clinicName: companyName,
    title: 'Cadastro de pacientes',
    sessionToken,
    contextLines: [`${items.length} registro(s)`, ...(contextLines ?? [])],
  });
  if (!isCurrent()) return;

  if (format === 'xlsx') {
    const rows = getPacienteExportRows(items);
    const headers = pacienteExportColumns.map((column) => column.header);
    const blob = createReportXlsxBlob(rows, headers, { sheetName: 'Pacientes', identity });
    if (isCurrent()) downloadBlob(blob, fileName);
    return;
  }

  const document = await createPatientListPdf(items, identity);
  if (!isCurrent()) return;
  document.save(fileName);
}
