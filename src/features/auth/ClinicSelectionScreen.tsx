import { Building2, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Theme } from '../../appTypes';
import type { LoginClinicOption } from '../../services';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { TechCredit } from '../../shared/components/TechCredit';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { AlertMessage } from '../../shared/components/ui';
import { API_ASSET_BASE_URL } from '../../shared/utils/formatters';
import './auth.css';
import './clinicSelection.css';

type ClinicSelectionScreenProps = {
  clinics: LoginClinicOption[];
  loading: boolean;
  error: string;
  theme: Theme;
  onSelect: (clinicaId: number) => void;
  onBack: () => void;
  onThemeToggle: () => void;
};

export function ClinicSelectionScreen({
  clinics,
  loading,
  error,
  theme,
  onSelect,
  onBack,
  onThemeToggle,
}: ClinicSelectionScreenProps) {
  return (
    <main className="auth-screen">
      <LoadingOverlay active={loading} message="Entrando na clínica selecionada…" />
      <TechCredit />
      <ThemeToggle theme={theme} onToggle={onThemeToggle} floating />
      <section className="auth-panel login-panel clinic-selection-panel" aria-busy={loading}>
        <div className="brand-block">
          <div className="brand-mark clinic-selection-icon" aria-hidden="true"><Building2 size={28} /></div>
          <div>
            <span className="eyebrow">HEMODINKS</span>
            <h1>Escolha onde deseja entrar</h1>
          </div>
        </div>

        <p className="team-login-description">Seu acesso está vinculado a mais de uma clínica. Selecione o ambiente desejado.</p>
        {error && <AlertMessage type="error">{error}</AlertMessage>}

        <ul className="clinic-selection-list" aria-label="Clínicas disponíveis">
          {clinics.map((clinic) => (
            <li key={clinic.clinicaId}>
              <button
                type="button"
                className="clinic-selection-option"
                onClick={() => onSelect(clinic.clinicaId)}
                disabled={loading}
              >
                <ClinicOptionLogo slug={clinic.slug} />
                <span className="clinic-option-name">{clinic.nome}</span>
                <ChevronRight className="clinic-option-arrow" size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        <button type="button" className="ghost-button login-help-link" onClick={onBack} disabled={loading}>
          Voltar ao login
        </button>
      </section>
    </main>
  );
}

function ClinicOptionLogo({ slug }: { slug: string }) {
  const source = slug ? `${API_ASSET_BASE_URL}/api/public/clinicas/${encodeURIComponent(slug)}/foto` : '';
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const showLogo = Boolean(source && failedSource !== source);

  return (
    <span className={`clinic-option-icon${showLogo ? ' clinic-option-logo' : ''}`} aria-hidden="true">
      {showLogo ? (
        <img src={source} alt="" onError={() => setFailedSource(source)} />
      ) : <Building2 size={22} />}
    </span>
  );
}
