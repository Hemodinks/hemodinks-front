import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const root = process.cwd();
const outputDirectory = resolve(root, 'reports', 'export-samples');
await mkdir(outputDirectory, { recursive: true });

const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
try {
  const identityModule = await server.ssrLoadModule('/src/shared/export/reportIdentity.ts');
  const pdfModule = await server.ssrLoadModule('/src/shared/export/pdfReport.ts');
  const xlsxModule = await server.ssrLoadModule('/src/shared/export/xlsxReport.ts');
  const patientFormModule = await server.ssrLoadModule('/src/features/patients/export/patientFormExporter.ts');
  const logoBytes = await readFile(resolve(root, 'imagem hemodinks.jpg'));
  const logo = await identityModule.normalizeReportLogo(new Blob([logoBytes], { type: 'image/jpeg' }));
  const generatedAt = new Date('2026-08-10T15:30:00-03:00');
  const identity = {
    clinicName: 'Clínica Teste Local',
    title: 'Relatório de atendimentos e faturamento',
    generatedAt,
    primaryColor: '#14877D',
    contextLines: ['Período: 01/08/2026 a 10/08/2026', 'Status: todos'],
    logo,
  };
  const headers = ['Data', 'Paciente', 'Procedimento', 'Hospital', 'Convênio', 'Valor'];
  const createRows = (length) => Array.from({ length }, (_, index) => [
    '10/08/2026',
    `Paciente demonstração ${index + 1}`,
    `Procedimento médico com descrição extensa e acentuação ${index + 1}`,
    'Hospital Esperança',
    'Convênio Saúde',
    `R$ ${(1234.56 + index).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
  ]);

  const createPdf = async (rowCount, fileName) => {
    const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    autoTable(document, {
      head: [headers],
      body: createRows(rowCount),
      startY: pdfModule.PDF_REPORT_BODY_START,
      ...pdfModule.getPdfReportTableStyles(identity),
      ...pdfModule.getPdfReportPageHooks(document, identity),
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      columnStyles: { 0: { halign: 'center' }, 5: { halign: 'right' } },
    });
    pdfModule.addPdfReportFooters(document, identity);
    await writeFile(resolve(outputDirectory, fileName), Buffer.from(document.output('arraybuffer')));
  };

  await createPdf(8, 'relatorio-uma-pagina.pdf');
  await createPdf(120, 'relatorio-varias-paginas.pdf');

  const patientDocument = await patientFormModule.createPatientFormPdf({
    data: '05/08/2026',
    nomePaciente: 'Paciente com nome completo longo para validação visual',
    diagnostico: 'Diagnóstico clínico detalhado com acentuação e texto extenso para validar a quebra automática de linhas.',
    tratamentoMedico: 'Tratamento médico informado com recomendações e acompanhamento continuado.',
    convenio: 'Convênio Saúde',
    hospital: 'Hospital Esperança',
    opmeFornecedor: 'Fornecedor OPME',
    medico: 'Dra. Ana Médica',
    medicoAuxiliar1: 'Dr. Auxiliar Um',
    medicoAuxiliar2: '',
    autorizacao: 'AUT-2026-001',
    repasseGlosa: 'R$ 85,00',
    pagamento: 'R$ 118,46',
    novaObservacao: 'Observação extensa para confirmar legibilidade, margens, fundo branco e ausência de sobreposição no documento final.',
    procedimentos: [
      { cbhpmCodigo: '10102019', procedimento: 'Visita hospitalar a paciente internado', valorReferencia: 67.82, cbhpmPorte: '2B' },
      { cbhpmCodigo: '10101012', procedimento: 'Consulta em horário normal ou preestabelecido', valorReferencia: 67.82, cbhpmPorte: '2B' },
      { cbhpmCodigo: '10101012', procedimento: 'Consulta em horário normal ou preestabelecido', valorReferencia: 67.82, cbhpmPorte: '2B' },
    ],
  }, { ...identity, title: 'Cadastro de paciente', contextLines: ['Paciente com dados completos'] }, []);
  await writeFile(resolve(outputDirectory, 'cadastro-paciente.pdf'), Buffer.from(patientDocument.output('arraybuffer')));

  const xlsxRows = createRows(35).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index]])));
  const withLogo = xlsxModule.createReportXlsxBlob(xlsxRows, headers, { sheetName: 'Atendimentos', identity });
  const withoutLogo = xlsxModule.createReportXlsxBlob(xlsxRows, headers, { sheetName: 'Atendimentos', identity: { ...identity, logo: null } });
  await writeFile(resolve(outputDirectory, 'relatorio-com-logo.xlsx'), Buffer.from(await withLogo.arrayBuffer()));
  await writeFile(resolve(outputDirectory, 'relatorio-sem-logo.xlsx'), Buffer.from(await withoutLogo.arrayBuffer()));
  process.stdout.write(`${outputDirectory}\n`);
} finally {
  await server.close();
}
