import { useState } from 'react';
import { Copy } from 'lucide-react';

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}

type CopyValueProps = {
  label: string;
  value: string;
  displayValue?: string;
};

export function CopyValue({ label, value, displayValue = value }: CopyValueProps) {
  const [copied, setCopied] = useState(false);
  const valueToShow = displayValue || '-';
  const valueToCopy = value || valueToShow;

  const handleCopy = async () => {
    if (!valueToCopy || valueToCopy === '-') {
      return;
    }

    await copyText(valueToCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <span className="copyable-value">
      <span>{valueToShow}</span>
      <button
        type="button"
        className="copy-button"
        onClick={() => void handleCopy()}
        title={`Copiar ${label} (Ctrl+C)`}
        aria-label={`Copiar ${label}`}
      >
        <Copy size={15} />
      </button>
      {copied && <span className="copied-label">Copiado</span>}
    </span>
  );
}
