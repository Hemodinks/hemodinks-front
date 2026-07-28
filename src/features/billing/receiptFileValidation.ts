export function isSupportedReceiptFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return (
    (extension === 'pdf' && file.type === 'application/pdf') ||
    ((extension === 'jpg' || extension === 'jpeg') && file.type === 'image/jpeg')
  );
}

export function receiptExtensionFromBlob(blob: Blob) {
  if (blob.type === 'application/pdf') return 'pdf';
  if (blob.type === 'image/jpeg') return 'jpg';
  throw new Error('O comprovante recebido não possui um formato PDF ou JPG válido.');
}
