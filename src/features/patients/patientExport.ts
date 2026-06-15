import type { Paciente } from '../../types';
import { toDisplayDate } from '../../shared/utils/formatters';
import { normalizeCbhpmCodigo } from './patientUtils';

export const pacienteExportColumns = [
  { header: 'Paciente', getValue: (paciente: Paciente) => paciente.nomePaciente },
  { header: 'Data procedimento', getValue: (paciente: Paciente) => toDisplayDate(paciente.data || '') || '-' },
  { header: 'Hospital', getValue: (paciente: Paciente) => paciente.hospital || '-' },
  { header: 'Cirurgiao', getValue: (paciente: Paciente) => paciente.medico || '-' },
  { header: 'Medico auxiliar 1', getValue: (paciente: Paciente) => paciente.medicoAuxiliar1 || '-' },
  { header: 'Medico auxiliar 2', getValue: (paciente: Paciente) => paciente.medicoAuxiliar2 || '-' },
  { header: 'Convenio', getValue: (paciente: Paciente) => paciente.convenio || '-' },
  { header: 'Fornecedor OPME', getValue: (paciente: Paciente) => paciente.opmeFornecedor || '-' },
  { header: 'Codigo CBHPM', getValue: (paciente: Paciente) => normalizeCbhpmCodigo(paciente.cbhpmCodigo) || '-' },
  { header: 'Porte CBHPM', getValue: (paciente: Paciente) => paciente.cbhpmPorte || '-' },
  { header: 'Procedimento', getValue: (paciente: Paciente) => paciente.procedimento || '-' },
  { header: 'Autorizacao', getValue: (paciente: Paciente) => paciente.autorizacao || '-' },
  { header: 'Pagamento', getValue: (paciente: Paciente) => paciente.pagamento || '-' },
  { header: 'Repasse/Glosa', getValue: (paciente: Paciente) => paciente.repasseGlosa || '-' },
  { header: 'Status pago', getValue: (paciente: Paciente) => (paciente.statusPago ? 'Pago' : 'Pendente') },
  { header: 'Ativo', getValue: (paciente: Paciente) => (paciente.ativo ? 'Sim' : 'Nao') },
  { header: 'Arquivos', getValue: (paciente: Paciente) => String(paciente.arquivosCount ?? paciente.arquivos.length) },
] as const;

export function getPacienteExportRows(items: Paciente[]) {
  return items.map((paciente) => Object.fromEntries(
    pacienteExportColumns.map((column) => [column.header, column.getValue(paciente)]),
  ));
}

export function getPatientExportFileName(extension: 'xlsx' | 'pdf') {
  const date = new Date().toISOString().slice(0, 10);
  return `pacientes-hemodinks-${date}.${extension}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getExcelColumnName(index: number) {
  let column = '';
  let value = index + 1;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    value = Math.floor((value - 1) / 26);
  }

  return column;
}

function buildWorksheetXml(rows: Record<string, string>[]) {
  const headers = pacienteExportColumns.map((column) => column.header);
  const sheetRows = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))];
  const columnsXml = headers.map((header, index) => {
    const width = Math.min(36, Math.max(14, header.length + 4));
    const columnNumber = index + 1;
    return `<col min="${columnNumber}" max="${columnNumber}" width="${width}" customWidth="1"/>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${columnsXml}</cols>
  <sheetData>
    ${sheetRows.map((cells, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cellXml = cells.map((cell, cellIndex) => {
        const cellReference = `${getExcelColumnName(cellIndex)}${rowNumber}`;
        const headerStyle = rowIndex === 0 ? ' s="1"' : '';
        return `<c r="${cellReference}"${headerStyle} t="inlineStr"><is><t>${escapeXml(String(cell))}</t></is></c>`;
      }).join('');
      return `<row r="${rowNumber}">${cellXml}</row>`;
    }).join('\n    ')}
  </sheetData>
</worksheet>`;
}

function buildWorkbookStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD9FBEA"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
}

function getCrc32Table() {
  return Array.from({ length: 256 }, (_, index) => {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }

    return value >>> 0;
  });
}

const crc32Table = getCrc32Table();

function getCrc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
}

function appendUint16(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function appendUint32(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function concatBytes(parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

function createZipBlob(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder();
  const { time, date } = getDosDateTime();
  const zipParts: Uint8Array[] = [];
  const centralDirectoryParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = getCrc32(contentBytes);
    const localHeader: number[] = [];

    appendUint32(localHeader, 0x04034b50);
    appendUint16(localHeader, 20);
    appendUint16(localHeader, 0);
    appendUint16(localHeader, 0);
    appendUint16(localHeader, time);
    appendUint16(localHeader, date);
    appendUint32(localHeader, crc);
    appendUint32(localHeader, contentBytes.length);
    appendUint32(localHeader, contentBytes.length);
    appendUint16(localHeader, nameBytes.length);
    appendUint16(localHeader, 0);

    const localHeaderBytes = new Uint8Array(localHeader);
    zipParts.push(localHeaderBytes, nameBytes, contentBytes);

    const centralHeader: number[] = [];
    appendUint32(centralHeader, 0x02014b50);
    appendUint16(centralHeader, 20);
    appendUint16(centralHeader, 20);
    appendUint16(centralHeader, 0);
    appendUint16(centralHeader, 0);
    appendUint16(centralHeader, time);
    appendUint16(centralHeader, date);
    appendUint32(centralHeader, crc);
    appendUint32(centralHeader, contentBytes.length);
    appendUint32(centralHeader, contentBytes.length);
    appendUint16(centralHeader, nameBytes.length);
    appendUint16(centralHeader, 0);
    appendUint16(centralHeader, 0);
    appendUint16(centralHeader, 0);
    appendUint16(centralHeader, 0);
    appendUint32(centralHeader, 0);
    appendUint32(centralHeader, offset);

    centralDirectoryParts.push(new Uint8Array(centralHeader), nameBytes);
    offset += localHeaderBytes.length + nameBytes.length + contentBytes.length;
  }

  const centralDirectory = concatBytes(centralDirectoryParts);
  const endRecord: number[] = [];
  appendUint32(endRecord, 0x06054b50);
  appendUint16(endRecord, 0);
  appendUint16(endRecord, 0);
  appendUint16(endRecord, files.length);
  appendUint16(endRecord, files.length);
  appendUint32(endRecord, centralDirectory.length);
  appendUint32(endRecord, offset);
  appendUint16(endRecord, 0);

  const zipBytes = concatBytes([...zipParts, centralDirectory, new Uint8Array(endRecord)]);
  return new Blob([zipBytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function createXlsxBlob(rows: Record<string, string>[]) {
  return createZipBlob([
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Pacientes" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/styles.xml',
      content: buildWorkbookStylesXml(),
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content: buildWorksheetXml(rows),
    },
  ]);
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
