import { downloadBlob } from '../../../shared/utils/downloadFile';
import { addPdfReportFooters, getPdfReportPageHooks, getPdfReportTableStyles, PDF_REPORT_BODY_START } from '../../../shared/export/pdfReport';
import { normalizeReportValue, resolveReportIdentity, type ReportIdentity } from '../../../shared/export/reportIdentity';
import { createReportXlsxBlob } from '../../../shared/export/xlsxReport';
import type { ReportExportFormat, ReportRecord } from '../reportTypes';
import { getReportExportRows, getReportFileName, reportColumns } from './reportExportData';

type Options = {
  format: ReportExportFormat;
  records: ReportRecord[];
  companyName: string;
  sessionToken?: string;
  contextLines?: string[];
};

async function createReportPdf(records: ReportRecord[], identity: ReportIdentity) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  autoTableModule.default(document, {
    head: [reportColumns.map((column) => column.header)],
    body: records.map((record) => reportColumns.map((column) => normalizeReportValue(column.getValue(record)))),
    startY: PDF_REPORT_BODY_START,
    columnStyles: {
      0: { halign: 'center' },
      13: { halign: 'right' },
      14: { halign: 'right' },
      15: { halign: 'right' },
      17: { halign: 'center' },
      18: { halign: 'center' },
    },
    ...getPdfReportTableStyles(identity),
    styles: { ...getPdfReportTableStyles(identity).styles, fontSize: 4.8, cellPadding: 2.2 },
    ...getPdfReportPageHooks(document, identity),
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
  });
  addPdfReportFooters(document, identity);
  return document;
}

export async function exportReport({ format, records, companyName, sessionToken, contextLines }: Options) {
  const fileName = getReportFileName(format, companyName);
  const identity = await resolveReportIdentity({
    clinicName: companyName,
    title: 'Relatório de atendimentos e faturamento',
    sessionToken,
    contextLines: [`${records.length} registro(s)`, ...(contextLines ?? [])],
  });
  if (format === 'xlsx') {
    const rows = getReportExportRows(records);
    downloadBlob(createReportXlsxBlob(rows, reportColumns.map((column) => column.header), { sheetName: 'Relatórios', identity }), fileName);
    return;
  }
  const document = await createReportPdf(records, identity);
  document.save(fileName);
}
