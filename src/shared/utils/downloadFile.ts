/**
 * Starts a browser download and always releases the temporary object URL.
 * Keeping this DOM concern here prevents export use cases from manipulating
 * document elements directly.
 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  try {
    anchor.href = url;
    anchor.download = fileName;
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Releasing on the next task avoids cancelling downloads in some browsers.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
