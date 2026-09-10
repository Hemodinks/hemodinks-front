import { FileCheck2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Theme } from '../../appTypes';
import { BootstrapLoading } from '../../shared/components/BootstrapLoading';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { TechCredit } from '../../shared/components/TechCredit';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { LegalAcceptanceAction } from './LegalAcceptanceAction';
import { TERMS_VERSION } from './legalVersions';

type Props = {
  theme: Theme;
  loading: boolean;
  slow: boolean;
  canRetry: boolean;
  accepting: boolean;
  error: string;
  onThemeToggle: () => void;
  onAccept: () => Promise<boolean>;
  onRetry: () => Promise<void>;
  onLogout: () => void;
};

export function LegalAcceptanceGate({
  theme,
  loading,
  slow,
  canRetry,
  accepting,
  error,
  onThemeToggle,
  onAccept,
  onRetry,
  onLogout,
}: Props) {
  return (
    <main className="auth-screen compact">
      <BootstrapLoading active={loading} slow={slow} canRetry={canRetry} onRetry={onRetry} stage="Validando sua sessão, clínica e Termos de Uso…" />
      <LoadingOverlay active={accepting} message="Registrando seu aceite…" />
      <TechCredit />
      <ThemeToggle theme={theme} onToggle={onThemeToggle} floating />
      <section className="auth-panel legal-acceptance-panel" aria-labelledby="legal-acceptance-title" inert={loading || accepting}>
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

        <LegalAcceptanceAction
          loading={loading}
          accepting={accepting}
          error={error}
          onAccept={onAccept}
          onRetry={onRetry}
        />

        <button type="button" className="ghost-button" onClick={onLogout}>Sair</button>
      </section>
    </main>
  );
}
