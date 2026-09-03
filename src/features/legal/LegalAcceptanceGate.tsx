import { type FormEvent, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Theme } from '../../appTypes';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { TechCredit } from '../../shared/components/TechCredit';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { TERMS_VERSION } from './legalVersions';

type Props = {
  theme: Theme;
  loading: boolean;
  accepting: boolean;
  error: string;
  onThemeToggle: () => void;
  onAccept: () => Promise<void>;
  onRetry: () => Promise<void>;
  onLogout: () => void;
};

export function LegalAcceptanceGate({
  theme,
  loading,
  accepting,
  error,
  onThemeToggle,
  onAccept,
  onRetry,
  onLogout,
}: Props) {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (acknowledged) void onAccept();
  };

  return (
    <main className="auth-screen compact">
      <LoadingOverlay active={loading || accepting} message={accepting ? 'Registrando seu aceite…' : 'Verificando os Termos de Uso…'} />
      <TechCredit />
      <ThemeToggle theme={theme} onToggle={onThemeToggle} floating />
      <section className="auth-panel legal-acceptance-panel" aria-labelledby="legal-acceptance-title">
        <div className="brand-block">
          <FileCheck2 size={36} strokeWidth={1.8} />
          <div>
            <span className="eyebrow">Versão {TERMS_VERSION}</span>
            <h1 id="legal-acceptance-title">Documentos jurídicos atualizados</h1>
          </div>
        </div>

        <p>Antes de continuar, leia os documentos jurídicos vigentes do HemoDinks.</p>
        <p className="legal-acceptance-links">
          <Link to="/termos-de-uso">Ler os Termos de Uso</Link>
          <Link to="/politica-de-privacidade">Ler o Aviso de Privacidade</Link>
        </p>

        {error ? (
          <div className="stack">
            <p className="alert error">{error}</p>
            <button type="button" className="ghost-button" onClick={() => void onRetry()}>Tentar novamente</button>
          </div>
        ) : (
          <form className="stack" onSubmit={handleSubmit}>
            <label className="legal-acceptance-check">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              <span>Li e estou ciente dos Termos de Uso e do Aviso de Privacidade do HemoDinks.</span>
            </label>
            <button type="submit" className="primary-action" disabled={!acknowledged || loading || accepting}>
              Aceitar e continuar
            </button>
          </form>
        )}

        <button type="button" className="ghost-button" onClick={onLogout}>Sair</button>
      </section>
    </main>
  );
}
