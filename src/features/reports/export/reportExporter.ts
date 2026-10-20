import { downloadBlob } from '../../../shared/utils/downloadFile';
import { addPdfReportFooters, getPdfReportPageHooks, getPdfReportTableStyles, PDF_REPORT_BODY_START } from '../../../shared/export/pdfReport';
import { normalizeReportValue, resolveReportIdentity, type ReportIdentity } from '../../../shared/export/reportIdentity';
import { createReportXlsxBlob } from '../../../shared/export/xlsxReport';
import { sessionEpoch } from '../../../services/sessionEpoch';
import { summarizeBillingRecords } from '../../billing/billingAnalytics';
import { formatCurrency } from '../../../shared/utils/formatters';
import type { ReportExportDetailLevel, ReportExportFormat, ReportRecord } from '../reportTypes';
import { getReportSurgeryTypeRows, reportSurgeryTypeHeaders, getReportExportRows, getReportFileName, getReportPendingRows, reportColumns, reportPendingHeaders } from './reportExportData';

type Options = {
  format: ReportExportFormat;
  records: ReportRecord[];
  companyName: string;
  sessionToken?: string;
  contextLines?: string[];
  detailLevel?: ReportExportDetailLevel;
  shouldContinue?: () => boolean;
};

async function createReportPdf(records: ReportRecord[], identity: ReportIdentity, detailLevel: ReportExportDetailLevel) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const drawnPages = new Set<number>();
  const pageHooks = (pageIdentity: ReportIdentity) => ({
    willDrawPage: () => {
      const page = document.getCurrentPageInfo().pageNumber;
      if (drawnPages.has(page)) return;
      drawnPages.add(page);
      getPdfReportPageHooks(document, pageIdentity).willDrawPage();
    },
  });
  autoTableModule.default(document, {
    head: [['Resumo e filtros da consulta']],
    body: identity.contextLines.map((line) => [line]),
    startY: PDF_REPORT_BODY_START,
    ...getPdfReportTableStyles(identity),
    ...pageHooks(identity),
    rowPageBreak: 'avoid',
  });
  autoTableModule.default(document, {
    head: [reportColumns.map((column) => column.header)],
    body: records.map((record) => reportColumns.map((column) => normalizeReportValue(column.getValue(record)))),
    startY: (document as typeof document & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12,
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'center' },
      14: { halign: 'right' },
      15: { halign: 'right' },
      16: { halign: 'right' },
      17: { halign: 'center' },
      18: { halign: 'center' },
      19: { halign: 'center' },
      20: { halign: 'center' },
    },
    ...getPdfReportTableStyles(identity),
    styles: { ...getPdfReportTableStyles(identity).styles, fontSize: 6.2, cellPadding: 2.2 },
    ...pageHooks(identity),
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
  });
  autoTableModule.default(document, {
    head: [reportSurgeryTypeHeaders],
    body: getReportSurgeryTypeRows(records).map((row) => reportSurgeryTypeHeaders.map((header) => row[header as keyof typeof row])),
    startY: (document as typeof document & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12,
    ...getPdfReportTableStyles(identity),
    ...pageHooks(identity),
    rowPageBreak: 'avoid',
  });
  if (detailLevel === 'complete') {
    const pendingRows = getReportPendingRows(records);
    if (pendingRows.length) document.addPage();
    autoTableModule.default(document, {
      head: [pendingRows.length ? [...reportPendingHeaders] : ['Detalhamento de pendências']],
      body: pendingRows.length
        ? pendingRows.map((row) => reportPendingHeaders.map((header) => normalizeReportValue(row[header])))
        : [['Nenhuma pendência encontrada no checklist da consulta.']],
      startY: pendingRows.length ? PDF_REPORT_BODY_START : (document as typeof document & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12,
      ...getPdfReportTableStyles(identity),
      ...pageHooks({ ...identity, title: 'Detalhamento de pendências' }),
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
    });
  }
  addPdfReportFooters(document, identity);
  return document;
}

export async function exportReport({ format, records, companyName, sessionToken, contextLines, detailLevel = 'complete', shouldContinue }: Options) {
  const epoch = sessionEpoch();
  const isCurrent = () => epoch === sessionEpoch() && (shouldContinue?.() ?? true);
  const fileName = getReportFileName(format, companyName);
  const summary = summarizeBillingRecords(records);
  const identity = await resolveReportIdentity({
    clinicName: companyName,
    title: 'Relatório de atendimentos e faturamento',
    sessionToken,
    contextLines: [
      `${records.length} atendimento(s)`,
      `Faturado: ${formatCurrency(summary.totalGrossAmount)} • Glosa: ${formatCurrency(summary.totalGlosaAmount)} • Líquido: ${formatCurrency(summary.totalNetAmount)}`,
      `Pagos: ${summary.paidCount} • Sem valor: ${summary.missingAmountCount}`,
      `Pagamentos pendentes: ${records.filter((record) => record.status === 'pending').length} (quitação não declarada; não comprova dívida ou atraso)`,
      `Atendimentos com checklist incompleto: ${records.filter((record) => record.pendingChecklistItems > 0).length}`,
      `Itens pendentes do checklist: ${records.reduce((sum, record) => sum + record.pendingChecklistItems, 0)} (itens documentais/operacionais, não pagamentos)`,
      ...(contextLines ?? []),
    ],
  });
  if (!isCurrent()) return;
  if (format === 'xlsx') {
    const rows = getReportExportRows(records);
    const blob = createReportXlsxBlob(rows, reportColumns.map((column) => column.header), {
      sheetName: 'Atendimentos', identity,
      additionalSheets: [{ sheetName: 'Resumo por tipo de cirurgia', headers: reportSurgeryTypeHeaders, rows: getReportSurgeryTypeRows(records) }, ...(detailLevel === 'complete' ? [{
        sheetName: 'Detalhamento de pendências', headers: reportPendingHeaders,
        rows: getReportPendingRows(records), emptyMessage: 'Nenhuma pendência encontrada no checklist da consulta.',
      }] : [])],
    });
    if (isCurrent()) downloadBlob(blob, fileName);
    return;
  }
  const document = await createReportPdf(records, identity, detailLevel);
  if (isCurrent()) document.save(fileName);
}
