import { useEffect, useRef, useState } from 'react';
import { sessionEpoch } from '../../services/sessionEpoch';
import { Download } from 'lucide-react';
import { getErrorMessage } from '../utils/formatters';
import { downloadBlob } from '../utils/downloadFile';

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
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const download = async () => {
    const epoch = sessionEpoch();
    const isCurrent = () => mounted.current && epoch === sessionEpoch();
    setLoading(true);
    setError('');

    try {
      const blob = await loadFile();
      if (isCurrent()) downloadBlob(blob, fileName);
    } catch (downloadError) {
      if (isCurrent()) setError(getErrorMessage(downloadError));
    } finally {
      if (mounted.current) setLoading(false);
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
