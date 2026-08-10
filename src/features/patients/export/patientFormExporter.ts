import type { PacienteExportFormat } from '../../../appTypes';
import { formatCurrency } from '../../../shared/utils/formatters';
import { downloadBlob } from '../../../shared/utils/downloadFile';
import { addPdfReportFooters, drawPdfReportHeader, drawPdfSectionTitle, getPdfReportTableStyles, PDF_REPORT_BODY_START, PDF_REPORT_MARGIN } from '../../../shared/export/pdfReport';
import { normalizeReportValue, resolveReportIdentity, type ReportIdentity } from '../../../shared/export/reportIdentity';
import { createReportXlsxBlob } from '../../../shared/export/xlsxReport';
import type { PacienteFormData, PacienteObservacao } from '../../../types';
import { getCurrencyInputValue } from '../patientUtils';
import {
  getPacienteFormExportRows,
  getPatientFormExportFileName,
  pacienteFormExportColumns,
} from './patientExportData';

type ExportPatientFormOptions = {
  format: PacienteExportFormat;
  formData: PacienteFormData;
  companyName: string;
  sessionToken?: string;
  observations?: PacienteObservacao[];
};

export function buildObservationText(formData: PacienteFormData, observations: PacienteObservacao[]) {
  if (!observations.length) {
    return { text: formData.novaObservacao?.trim() || '', meta: '' };
  }

  const parts: string[] = [];
  for (const observation of observations) {
    const date = observation.dataCadastro
      ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(observation.dataCadastro))
      : '';
    const sender = [observation.autorNome, observation.autorPerfilNome]
      .filter(Boolean)
      .join(' / ');
    const recipient = [observation.destinatarioNome, observation.destinatarioPerfilNome]
      .filter(Boolean)
      .join(' / ');
    const metadata = [
      sender ? `Remetente: ${sender}` : '',
      recipient ? `Destinatário: ${recipient}` : '',
      `Status: ${observation.foiLida ? 'Lida' : 'Não lida'}`,
      date ? `Data e hora: ${date}` : '',
    ].filter(Boolean).join(' • ');

    if (metadata) parts.push(metadata);
    if (observation.texto) parts.push(observation.texto.trim());
    parts.push('');
  }

  if (formData.novaObservacao?.trim()) {
    parts.push(formData.novaObservacao.trim());
  }

  return { text: parts.join('\n'), meta: `${observations.length} observação(s)` };
}

export async function createPatientFormPdf(
  formData: PacienteFormData,
  identity: ReportIdentity,
  observations: PacienteObservacao[],
) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const document = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const marginLeft = PDF_REPORT_MARGIN;
  const lineHeight = 16;
  const pageWidth = document.internal.pageSize.getWidth();
  let y = PDF_REPORT_BODY_START;
  drawPdfReportHeader(document, identity);

  const leftColX = marginLeft;
  const leftColWidth = 260;
  const rightColX = leftColX + leftColWidth + 36;
  document.setFontSize(10);

  document.setFont('helvetica', 'bold');
  document.text('Data procedimento:', leftColX, y);
  document.setFont('helvetica', 'normal');
  document.text(normalizeReportValue(formData.data), leftColX + 110, y);
  document.setFont('helvetica', 'bold');
  document.text('Paciente:', rightColX, y);
  document.setFont('helvetica', 'normal');
  const patientValueX = rightColX + 60;
  const patientLines = document.splitTextToSize(
    normalizeReportValue(formData.nomePaciente),
    pageWidth - patientValueX - marginLeft,
  );
  document.text(patientLines, patientValueX, y);
  y += Math.max(lineHeight, patientLines.length * (lineHeight - 2));

  document.setFont('helvetica', 'bold');
  document.text('Diagnóstico:', leftColX, y);
  document.setFont('helvetica', 'normal');
  const diagnosisLines = document.splitTextToSize(normalizeReportValue(formData.diagnostico), pageWidth - marginLeft * 2);
  document.text(diagnosisLines, leftColX, y + lineHeight);
  y += lineHeight + diagnosisLines.length * (lineHeight - 2);

  document.setFont('helvetica', 'bold');
  document.text('Tratamento médico:', leftColX, y);
  document.setFont('helvetica', 'normal');
  const treatmentLines = document.splitTextToSize(normalizeReportValue(formData.tratamentoMedico), pageWidth - marginLeft * 2);
  document.text(treatmentLines, leftColX, y + lineHeight);
  y += lineHeight + treatmentLines.length * (lineHeight - 2) + 4;

  document.setFont('helvetica', 'bold');
  document.text('Convênio:', leftColX, y);
  document.setFont('helvetica', 'normal');
  document.text(normalizeReportValue(formData.convenio), leftColX + 70, y);
  document.setFont('helvetica', 'bold');
  document.text('Hospital:', rightColX, y);
  document.setFont('helvetica', 'normal');
  document.text(normalizeReportValue(formData.hospital), rightColX + 60, y);
  y += lineHeight;

  document.setFont('helvetica', 'bold');
  document.text('Fornecedor OPME:', leftColX, y);
  document.setFont('helvetica', 'normal');
  document.text(normalizeReportValue(formData.opmeFornecedor), leftColX + 110, y);
  document.setFont('helvetica', 'bold');
  document.text('Cirurgião:', rightColX, y);
  document.setFont('helvetica', 'normal');
  document.text(normalizeReportValue(formData.medico), rightColX + 60, y);
  y += lineHeight;

  if (formData.medicoAuxiliar1 || formData.medicoAuxiliar2) {
    document.setFont('helvetica', 'bold');
    document.text('Médicos auxiliares:', leftColX, y);
    document.setFont('helvetica', 'normal');
    document.text(
      [formData.medicoAuxiliar1, formData.medicoAuxiliar2].filter(Boolean).join(' • '),
      leftColX + 120,
      y,
    );
    y += lineHeight + 6;
  } else {
    y += 6;
  }

  if (formData.procedimentos.length) {
    autoTableModule.default(document, {
      head: [['Código', 'Procedimento', 'Valor referência', 'Porte']],
      body: formData.procedimentos.map((procedure) => [
        procedure.cbhpmCodigo || '',
        procedure.procedimento || '',
        procedure.valorReferencia != null ? formatCurrency(procedure.valorReferencia) : normalizeReportValue(''),
        normalizeReportValue(procedure.cbhpmPorte),
      ]),
      startY: y,
      margin: { left: marginLeft, right: marginLeft },
      ...getPdfReportTableStyles(identity),
      styles: { ...getPdfReportTableStyles(identity).styles, fontSize: 9, cellPadding: 5 },
      willDrawPage: ({ pageNumber }) => {
        if (pageNumber > 1) drawPdfReportHeader(document, identity);
      },
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 319 },
        2: { cellWidth: 90, halign: 'right' },
        3: { cellWidth: 60, halign: 'center' },
      },
    });
    y = (document as typeof document & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  document.setFont('helvetica', 'bold');
  document.text('Autorização:', leftColX, y);
  document.setFont('helvetica', 'normal');
  document.text(normalizeReportValue(formData.autorizacao), leftColX + 80, y);
  document.setFont('helvetica', 'bold');
  document.text('Glosa:', rightColX, y);
  document.setFont('helvetica', 'normal');
  const glosaAmount = formData.repasseGlosa ? getCurrencyInputValue(formData.repasseGlosa) : 0;
  const glosaText = formData.repasseGlosa?.trim()
    ? (glosaAmount > 0 ? formatCurrency(glosaAmount) : formData.repasseGlosa.trim())
    : normalizeReportValue('');
  document.text(glosaText, rightColX + 40, y);
  y += 14;

  const estimatedValue = formData.procedimentos.reduce(
    (total, procedure) => total + (procedure.valorReferencia ?? 0),
    0,
  );
  document.setFont('helvetica', 'bold');
  document.text('Valor estimado:', leftColX, y);
  document.setFont('helvetica', 'normal');
  document.text(formatCurrency(estimatedValue), leftColX + 100, y);
  document.setFont('helvetica', 'bold');
  document.text('Valor recebido/pago:', rightColX, y);
  document.setFont('helvetica', 'normal');
  document.text(normalizeReportValue(formData.pagamento), rightColX + 120, y);
  y += 18;

  const observation = buildObservationText(formData, observations);
  y = drawPdfSectionTitle(document, identity, `Observações${observation.meta ? ` • ${observation.meta}` : ''}`, y);
  autoTableModule.default(document, {
    body: [[normalizeReportValue(observation.text)]],
    startY: y,
    ...getPdfReportTableStyles(identity),
    styles: { ...getPdfReportTableStyles(identity).styles, fontSize: 9, cellPadding: 8, minCellHeight: 76 },
    willDrawPage: ({ pageNumber }) => {
      if (pageNumber > 1) drawPdfReportHeader(document, identity);
    },
    showHead: 'never',
  });

  addPdfReportFooters(document, identity);

  return document;
}

export async function exportPatientForm({
  format,
  formData,
  companyName,
  sessionToken,
  observations = [],
}: ExportPatientFormOptions) {
  const fileName = getPatientFormExportFileName(format, companyName);
  const identity = await resolveReportIdentity({
    clinicName: companyName,
    title: 'Cadastro de paciente',
    sessionToken,
    contextLines: [formData.nomePaciente || 'Paciente não informado'],
  });

  if (format === 'xlsx') {
    const rows = getPacienteFormExportRows(formData);
    const headers = pacienteFormExportColumns.map((column) => column.header);
    downloadBlob(createReportXlsxBlob(rows, headers, { sheetName: 'Cadastro paciente', identity }), fileName);
    return;
  }

  const document = await createPatientFormPdf(formData, identity, observations);
  document.save(fileName);
}
