import type { jsPDF } from 'jspdf';
import type { UserOptions } from 'jspdf-autotable';
import { fitReportLogo, formatReportGenerationDate, getReportContrastColor, reportColorToRgb, type ReportIdentity } from './reportIdentity';

export const PDF_REPORT_MARGIN = 28;
export const PDF_REPORT_HEADER_HEIGHT = 78;
export const PDF_REPORT_BODY_START = PDF_REPORT_HEADER_HEIGHT + 18;
const FOOTER_HEIGHT = 24;

function hexToRgb(value: string): [number, number, number] {
  return reportColorToRgb(value);
}

export function drawPdfReportHeader(document: jsPDF, identity: ReportIdentity) {
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const [red, green, blue] = hexToRgb(identity.primaryColor);
  const contrast = getReportContrastColor(identity.primaryColor);
  const textColor = contrast === '#FFFFFF' ? [255, 255, 255] as const : [17, 24, 39] as const;

  document.setFillColor(255, 255, 255);
  document.rect(0, 0, pageWidth, pageHeight, 'F');
  document.setFillColor(red, green, blue);
  document.rect(0, 0, pageWidth, PDF_REPORT_HEADER_HEIGHT, 'F');

  let contentX = PDF_REPORT_MARGIN;
  if (identity.logo) {
    const size = fitReportLogo(identity.logo, 58, 48);
    const logoY = (PDF_REPORT_HEADER_HEIGHT - size.height) / 2;
    try {
      document.addImage(identity.logo.bytes, identity.logo.extension.toUpperCase(), PDF_REPORT_MARGIN, logoY, size.width, size.height);
      contentX += 70;
    } catch {
      // Uma logo inválida nunca deve impedir a geração do relatório.
    }
  }

  document.setTextColor(textColor[0], textColor[1], textColor[2]);
  document.setFont('helvetica', 'bold');
  document.setFontSize(13);
  const clinicLines = document.splitTextToSize(identity.clinicName, Math.max(150, pageWidth * 0.38));
  document.text(clinicLines.slice(0, 2), contentX, 25);

  document.setFont('helvetica', 'normal');
  document.setFontSize(8.5);
  document.text(`Gerado em ${formatReportGenerationDate(identity.generatedAt)}`, contentX, 57);

  const titleX = pageWidth * 0.55;
  document.setFont('helvetica', 'bold');
  document.setFontSize(13);
  const titleLines = document.splitTextToSize(identity.title, pageWidth - titleX - PDF_REPORT_MARGIN);
  document.text(titleLines.slice(0, 2), titleX, 25);
  if (identity.contextLines.length) {
    document.setFont('helvetica', 'normal');
    document.setFontSize(8);
    const context = document.splitTextToSize(identity.contextLines.join(' • '), pageWidth - titleX - PDF_REPORT_MARGIN);
    document.text(context.slice(0, 2), titleX, 57);
  }
  document.setTextColor(17, 24, 39);
}

export function getPdfReportTableStyles(identity: ReportIdentity): Pick<UserOptions, 'styles' | 'headStyles' | 'alternateRowStyles' | 'margin'> {
  const contrast = getReportContrastColor(identity.primaryColor);
  return {
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 4,
      overflow: 'linebreak',
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.35,
      textColor: [31, 41, 55],
    },
    headStyles: {
      fillColor: hexToRgb(identity.primaryColor),
      textColor: contrast === '#FFFFFF' ? [255, 255, 255] : [17, 24, 39],
      fontStyle: 'bold',
      valign: 'middle',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: PDF_REPORT_BODY_START, right: PDF_REPORT_MARGIN, bottom: FOOTER_HEIGHT + 12, left: PDF_REPORT_MARGIN },
  };
}

export function getPdfReportPageHooks(document: jsPDF, identity: ReportIdentity) {
  return {
    willDrawPage: () => drawPdfReportHeader(document, identity),
  };
}

export function drawPdfSectionTitle(document: jsPDF, identity: ReportIdentity, title: string, y: number) {
  document.setTextColor(...hexToRgb(identity.primaryColor));
  document.setFont('helvetica', 'bold');
  document.setFontSize(11);
  document.text(title, PDF_REPORT_MARGIN, y);
  document.setDrawColor(226, 232, 240);
  document.line(PDF_REPORT_MARGIN, y + 5, document.internal.pageSize.getWidth() - PDF_REPORT_MARGIN, y + 5);
  document.setTextColor(17, 24, 39);
  return y + 13;
}

export function addPdfReportFooters(document: jsPDF, identity: ReportIdentity) {
  const pageCount = document.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page);
    const pageWidth = document.internal.pageSize.getWidth();
    const pageHeight = document.internal.pageSize.getHeight();
    document.setDrawColor(226, 232, 240);
    document.line(PDF_REPORT_MARGIN, pageHeight - FOOTER_HEIGHT, pageWidth - PDF_REPORT_MARGIN, pageHeight - FOOTER_HEIGHT);
    document.setFont('helvetica', 'normal');
    document.setFontSize(7.5);
    document.setTextColor(100, 116, 139);
    document.text(formatReportGenerationDate(identity.generatedAt), PDF_REPORT_MARGIN, pageHeight - 9);
    document.text(`${identity.clinicName} • Página ${page} de ${pageCount}`, pageWidth - PDF_REPORT_MARGIN, pageHeight - 9, { align: 'right' });
  }
}
