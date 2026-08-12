import { getReportContrastColor, normalizeReportValue, type ReportIdentity } from './reportIdentity';

export type ReportExportRow = Record<string, unknown>;

type XlsxReportOptions = {
  sheetName?: string;
  identity?: ReportIdentity;
};

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
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

function toExcelDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const date = Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return Math.floor(date / 86_400_000) + 25569;
}

function toCurrencyNumber(value: string) {
  if (!/^R\$\s*/i.test(value.trim())) return null;
  const parsed = Number(value.replace(/^R\$\s*/i, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function buildCellXml(reference: string, value: unknown, style: number, header: string) {
  const normalized = normalizeReportValue(value);
  const date = /data|nascimento/i.test(header) ? toExcelDate(normalized) : null;
  if (date != null) return `<c r="${reference}" s="5"><v>${date}</v></c>`;
  const currency = toCurrencyNumber(normalized);
  if (currency != null) return `<c r="${reference}" s="6"><v>${currency}</v></c>`;
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(normalized)}</t></is></c>`;
}

function buildWorksheetXml(rows: ReportExportRow[], headers: readonly string[], identity?: ReportIdentity) {
  const lastColumn = getExcelColumnName(Math.max(0, headers.length - 1));
  const tableHeaderRow = identity ? 6 : 1;
  const dataStartRow = tableHeaderRow + 1;
  const textStartColumn = identity?.logo && headers.length >= 3 ? 2 : 0;
  const textStart = getExcelColumnName(textStartColumn);
  const columnsXml = headers.map((header, index) => {
    const longest = Math.max(header.length, ...rows.map((row) => normalizeReportValue(row[header]).length));
    const width = Math.min(48, Math.max(12, longest + 2));
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  }).join('');
  const metaRows = identity ? [
    `<row r="1" ht="24" customHeight="1"><c r="${textStart}1" s="1" t="inlineStr"><is><t>${escapeXml(identity.clinicName)}</t></is></c></row>`,
    `<row r="2" ht="22" customHeight="1"><c r="${textStart}2" s="1" t="inlineStr"><is><t>${escapeXml(identity.title)}</t></is></c></row>`,
    `<row r="3"><c r="${textStart}3" s="1" t="inlineStr"><is><t>${escapeXml(new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(identity.generatedAt))}</t></is></c></row>`,
    `<row r="4"><c r="${textStart}4" s="1" t="inlineStr"><is><t>${escapeXml(identity.contextLines.join(' • ') || 'Dados da tela')}</t></is></c></row>`,
    '<row r="5" ht="8" customHeight="1"/>',
  ].join('') : '';
  const headerCells = headers.map((header, index) => buildCellXml(`${getExcelColumnName(index)}${tableHeaderRow}`, header, 2, header)).join('');
  const dataRows = rows.map((row, rowIndex) => {
    const rowNumber = dataStartRow + rowIndex;
    const style = rowIndex % 2 ? 4 : 3;
    const cells = headers.map((header, index) => buildCellXml(`${getExcelColumnName(index)}${rowNumber}`, row[header], style, header)).join('');
    return `<row r="${rowNumber}">${cells}</row>`;
  }).join('');
  const mergeCells = identity
    ? `<mergeCells count="4">${[1, 2, 3, 4].map((row) => `<mergeCell ref="${textStart}${row}:${lastColumn}${row}"/>`).join('')}</mergeCells>`
    : '';
  const drawing = identity?.logo ? '<drawing r:id="rId1"/>' : '';
  const lastRow = Math.max(tableHeaderRow, dataStartRow + rows.length - 1);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="${tableHeaderRow}" topLeftCell="A${dataStartRow}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${columnsXml}</cols><sheetData>${metaRows}<row r="${tableHeaderRow}" ht="28" customHeight="1">${headerCells}</row>${dataRows}</sheetData>
  ${mergeCells}<autoFilter ref="A${tableHeaderRow}:${lastColumn}${lastRow}"/>
  <printOptions horizontalCentered="1"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup orientation="${headers.length > 8 ? 'landscape' : 'portrait'}" paperSize="9" fitToWidth="1" fitToHeight="0"/>
  <headerFooter><oddFooter>&amp;L${escapeXml(identity?.clinicName ?? '')}&amp;R Página &amp;P de &amp;N</oddFooter></headerFooter>${drawing}
</worksheet>`;
}

function buildWorkbookStylesXml(identity?: ReportIdentity) {
  const primary = (identity?.primaryColor ?? '#14877D').slice(1).toUpperCase();
  const contrast = getReportContrastColor(identity?.primaryColor ?? '#14877D').slice(1);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="[$R$-pt-BR] #,##0.00"/></numFmts>
  <fonts count="3"><font><sz val="10"/><color rgb="FF1F2937"/><name val="Calibri"/></font><font><b/><sz val="12"/><color rgb="FF${contrast}"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FF${contrast}"/><name val="Calibri"/></font></fonts>
  <fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF${primary}"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE2E8F0"/></left><right style="thin"><color rgb="FFE2E8F0"/></right><top style="thin"><color rgb="FFE2E8F0"/></top><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="165" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

const crc32Table = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  return value >>> 0;
});

function getCrc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function appendUint16(target: number[], value: number) { target.push(value & 0xff, (value >>> 8) & 0xff); }
function appendUint32(target: number[], value: number) { target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff); }
function concatBytes(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function createZipBlob(files: Array<{ name: string; content: string | Uint8Array }>) {
  const encoder = new TextEncoder();
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const zipParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = typeof file.content === 'string' ? encoder.encode(file.content) : file.content;
    const crc = getCrc32(contentBytes);
    const local: number[] = [];
    appendUint32(local, 0x04034b50); appendUint16(local, 20); appendUint16(local, 0); appendUint16(local, 0); appendUint16(local, time); appendUint16(local, date); appendUint32(local, crc); appendUint32(local, contentBytes.length); appendUint32(local, contentBytes.length); appendUint16(local, nameBytes.length); appendUint16(local, 0);
    const localBytes = new Uint8Array(local);
    zipParts.push(localBytes, nameBytes, contentBytes);
    const central: number[] = [];
    appendUint32(central, 0x02014b50); appendUint16(central, 20); appendUint16(central, 20); appendUint16(central, 0); appendUint16(central, 0); appendUint16(central, time); appendUint16(central, date); appendUint32(central, crc); appendUint32(central, contentBytes.length); appendUint32(central, contentBytes.length); appendUint16(central, nameBytes.length); appendUint16(central, 0); appendUint16(central, 0); appendUint16(central, 0); appendUint16(central, 0); appendUint32(central, 0); appendUint32(central, offset);
    centralParts.push(new Uint8Array(central), nameBytes);
    offset += localBytes.length + nameBytes.length + contentBytes.length;
  }
  const centralDirectory = concatBytes(centralParts);
  const end: number[] = [];
  appendUint32(end, 0x06054b50); appendUint16(end, 0); appendUint16(end, 0); appendUint16(end, files.length); appendUint16(end, files.length); appendUint32(end, centralDirectory.length); appendUint32(end, offset); appendUint16(end, 0);
  return new Blob([concatBytes([...zipParts, centralDirectory, new Uint8Array(end)])], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function buildDrawingFiles(identity?: ReportIdentity) {
  if (!identity?.logo) return [];
  const extension = identity.logo.extension === 'jpeg' ? 'jpeg' : 'png';
  const ratio = identity.logo.width / identity.logo.height;
  const widthEmu = Math.round(Math.min(1_800_000, 900_000 * ratio));
  const heightEmu = Math.round(widthEmu / ratio);
  return [
    { name: 'xl/worksheets/_rels/sheet1.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>' },
    { name: 'xl/drawings/drawing1.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>90000</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>60000</xdr:rowOff></xdr:from><xdr:ext cx="${widthEmu}" cy="${heightEmu}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1" name="Logo da clínica"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>` },
    { name: 'xl/drawings/_rels/drawing1.xml.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo.${extension}"/></Relationships>` },
    { name: `xl/media/logo.${extension}`, content: identity.logo.bytes },
  ];
}

export function createReportXlsxBlob(rows: ReportExportRow[], headers: readonly string[], options: XlsxReportOptions = {}) {
  const safeSheetName = escapeXml((options.sheetName ?? 'Dados').slice(0, 31) || 'Dados');
  const lastColumn = getExcelColumnName(Math.max(0, headers.length - 1));
  const logoExtension = options.identity?.logo?.extension;
  const imageDefault = logoExtension ? `<Default Extension="${logoExtension}" ContentType="image/${logoExtension}"/>` : '';
  const drawingOverride = logoExtension ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : '';
  const tableHeaderRow = options.identity ? 6 : 1;
  return createZipBlob([
    { name: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${imageDefault}<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>${drawingOverride}</Types>` },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeSheetName}" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'${safeSheetName}'!$${tableHeaderRow}:$${tableHeaderRow}</definedName><definedName name="_xlnm.Print_Area" localSheetId="0">'${safeSheetName}'!$A$1:$${lastColumn}$${Math.max(tableHeaderRow, tableHeaderRow + rows.length)}</definedName></definedNames></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { name: 'xl/styles.xml', content: buildWorkbookStylesXml(options.identity) },
    { name: 'xl/worksheets/sheet1.xml', content: buildWorksheetXml(rows, headers, options.identity) },
    ...buildDrawingFiles(options.identity),
  ]);
}
