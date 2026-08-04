import { describe, expect, it } from 'vitest';
import { isSupportedReceiptFile, receiptExtensionFromBlob } from './receiptFileValidation';

describe('receipt file validation', () => {
  it('aceita somente combinações válidas de extensão e MIME type', () => {
    expect(
      isSupportedReceiptFile(new File(['pdf'], 'comprovante.PDF', { type: 'application/pdf' })),
    ).toBe(true);
    expect(
      isSupportedReceiptFile(new File(['jpg'], 'comprovante.jpeg', { type: 'image/jpeg' })),
    ).toBe(true);
    expect(
      isSupportedReceiptFile(new File(['fake'], 'comprovante.pdf', { type: 'image/jpeg' })),
    ).toBe(false);
    expect(
      isSupportedReceiptFile(new File(['png'], 'comprovante.png', { type: 'image/png' })),
    ).toBe(false);
  });

  it('identifica a extensão de comprovantes retornados pela API', () => {
    expect(receiptExtensionFromBlob(new Blob(['pdf'], { type: 'application/pdf' }))).toBe('pdf');
    expect(receiptExtensionFromBlob(new Blob(['jpg'], { type: 'image/jpeg' }))).toBe('jpg');
  });

  it('rejeita comprovantes retornados com formato inesperado', () => {
    expect(() => receiptExtensionFromBlob(new Blob(['png'], { type: 'image/png' }))).toThrow(
      'O comprovante recebido não possui um formato PDF ou JPG válido.',
    );
  });
});
