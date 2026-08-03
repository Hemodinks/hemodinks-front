import { useState } from 'react';
import { Download } from 'lucide-react';
import { getErrorMessage } from '../utils/formatters';

type SecureFileDownloadButtonProps = {
  fileName: string;
  label?: string;
  loadFile: () => Promise<Blob>;
};

export function SecureFileDownloadButton({
  fileName,
  label = 'Baixar',
  loadFile,
}: SecureFileDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setLoading(true);
    setError('');

    try {
      const blob = await loadFile();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (downloadError) {
      setError(getErrorMessage(downloadError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="download-link"
      onClick={() => void download()}
      disabled={loading}
      title={error || `Baixar ${fileName}`}
    >
      <Download size={15} />
      {loading ? 'Baixando...' : error ? 'Tentar novamente' : label}
    </button>
  );
}
