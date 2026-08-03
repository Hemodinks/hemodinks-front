import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadGeneratedReceipt, type GeneratedReceiptData } from './receiptDocument';

const pdfDocument = {
  setFillColor: vi.fn(),
  rect: vi.fn(),
  setTextColor: vi.fn(),
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  text: vi.fn(),
  splitTextToSize: vi.fn((value: string) => [value]),
  setDrawColor: vi.fn(),
  line: vi.fn(),
  output: vi.fn(() => new Blob(['pdf'], { type: 'application/pdf' })),
};

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(function MockJsPdf() {
    return pdfDocument;
  }),
}));

const receipt: GeneratedReceiptData = {
  receiptId: 42,
  documentNumber: 'FAT 42/Á',
  patient: 'Paciente Hemodinks',
  paymentDate: '2026-07-28T12:00:00Z',
  amount: 1250.5,
  paymentMethod: 'Pix',
  bankReference: null,
  registeredBy: 'George Marcone',
};

describe('receipt document', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:receipt'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('gera e baixa o comprovante PDF com nome normalizado', async () => {
    await downloadGeneratedReceipt(receipt, 'pdf');

    expect(pdfDocument.text).toHaveBeenCalledWith('COMPROVANTE DE RECEBIMENTO', 18, 21);
    expect(pdfDocument.output).toHaveBeenCalledWith('blob');
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:receipt');
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it('gera e baixa o comprovante JPG', async () => {
    const context = {
      fillStyle: '',
      strokeStyle: '',
      font: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['jpg'], { type: 'image/jpeg' }));
    });

    await downloadGeneratedReceipt({ ...receipt, bankReference: 'PIX-001' }, 'jpg');

    expect(context.fillText).toHaveBeenCalledWith('COMPROVANTE DE RECEBIMENTO', 90, 125);
    expect(context.stroke).toHaveBeenCalledTimes(8);
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it('informa quando o navegador não permite criar o canvas do JPG', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    await expect(downloadGeneratedReceipt(receipt, 'jpg')).rejects.toThrow(
      'Não foi possível gerar o comprovante em JPG.',
    );
  });

  it('informa quando a conversão do canvas para JPG falha', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(null);
    });

    await expect(downloadGeneratedReceipt(receipt, 'jpg')).rejects.toThrow(
      'Não foi possível gerar o comprovante em JPG.',
    );
  });
});
