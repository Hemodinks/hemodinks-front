import { type FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import type { Theme } from '../../appTypes';
import type { PublicClinic } from '../../types';
import { CompanyLogo } from '../../shared/components/CompanyLogo';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { PasswordInput } from '../../shared/components/PasswordInput';
import { TechCredit } from '../../shared/components/TechCredit';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import {
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
} from '../../shared/utils/formatters';
import './auth.css';

type LoginScreenProps = {
  companyName: string;
  companyPhoto?: string | null;
  isBusy: boolean;
  theme: Theme;
  loginEmail: string;
  loginPassword: string;
  loginClinicValue: string;
  clinics: PublicClinic[];
  clinicsLoading: boolean;
  loginError: string;
  loginInfo: string;
  loginLoading: boolean;
  resetPasswordLoading: boolean;
  onThemeToggle: () => void;
  onLoginEmailChange: (value: string) => void;
  onLoginPasswordChange: (value: string) => void;
  onLoginClinicChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResetPassword: () => void;
};

export function LoginScreen({
  companyName,
  companyPhoto,
  isBusy,
  theme,
  loginEmail,
  loginPassword,
  loginClinicValue,
  clinics,
  clinicsLoading,
  loginError,
  loginInfo,
  loginLoading,
  resetPasswordLoading,
  onThemeToggle,
  onLoginEmailChange,
  onLoginPasswordChange,
  onLoginClinicChange,
  onSubmit,
  onResetPassword,
}: LoginScreenProps) {
  return (
    <main className="auth-screen">
      <LoadingOverlay active={isBusy} />
      <TechCredit />
      <ThemeToggle theme={theme} onToggle={onThemeToggle} floating />
      <section className="auth-panel">
        <div className="brand-block">
          <CompanyLogo companyName={companyName} photo={companyPhoto} className="brand-mark" />
          <div>
            <span className="eyebrow">{companyName}</span>
            <h1>Acesso ao sistema</h1>
          </div>
        </div>

        <form className="stack" onSubmit={onSubmit}>
          <label>
            Clínica
            <input
              type="text"
              list="login-clinic-options"
              value={loginClinicValue}
              onChange={(event) => onLoginClinicChange(event.target.value)}
              placeholder={clinicsLoading ? 'Carregando clínicas...' : 'Digite para localizar a clínica'}
              autoComplete="off"
              disabled={clinicsLoading}
              required
            />
            <datalist id="login-clinic-options">
              {clinics.map((clinic) => (
                <option key={clinic.id} value={`${clinic.nome} — ${clinic.slug}`} />
              ))}
            </datalist>
          </label>

          <label>
            Email
            <input
              type="email"
              value={loginEmail}
              onChange={(event) => onLoginEmailChange(event.target.value.slice(0, MAX_EMAIL_LENGTH))}
              autoComplete="email"
              maxLength={MAX_EMAIL_LENGTH}
              required
            />
          </label>

          <PasswordInput
            id="login-password"
            label="Senha"
            value={loginPassword}
            onChange={onLoginPasswordChange}
            autoComplete="current-password"
            maxLength={MAX_PASSWORD_LENGTH}
            required
          />

          {loginError && <p className="alert error">{loginError}</p>}
          {loginInfo && <p className="alert success">{loginInfo}</p>}

          <div className="button-row login-actions">
            <button type="button" className="ghost-button" onClick={onResetPassword} disabled={resetPasswordLoading}>
              {resetPasswordLoading ? 'Resetando...' : 'Esqueci minha senha'}
            </button>
            <button className="primary-action" type="submit" disabled={loginLoading}>
              <LogIn size={18} />
              {loginLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
