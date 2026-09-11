import { type FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import type { Theme } from '../../appTypes';
import type { PublicClinic } from '../../types';
import { CompanyLogo } from '../../shared/components/CompanyLogo';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { PasswordInput } from '../../shared/components/PasswordInput';
import { TechCredit } from '../../shared/components/TechCredit';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { AlertMessage, ToastMessage } from '../../shared/components/ui';
import { focusFirstInvalidFormField } from '../../shared/utils/focusInvalidFormField';
import { LegalFooter } from '../legal/LegalFooter';
import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH } from '../../shared/utils/formatters';
import './auth.css';
import { LoginLoadingOverlay } from './LoginLoadingOverlay';
import { LoginPreparation } from './LoginPreparation';
import { useLoginPreparation } from './useLoginPreparation';

type LoginScreenProps = {
  companyName: string;
  companyPhoto?: string | null;
  isBusy: boolean;
  theme: Theme;
  loginEmail: string;
  loginPassword: string;
  recoveryClinics: PublicClinic[];
  recoveryClinicValue: string;
  loginError: string;
  loginInfo: string;
  loginLoading: boolean;
  resetPasswordLoading: boolean;
  onThemeToggle: () => void;
  onLoginEmailChange: (value: string) => void;
  onLoginPasswordChange: (value: string) => void;
  onRecoveryClinicChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResetPassword: () => void;
  onStartTutorial: () => void;
  onCancelLogin: () => void;
};

export function LoginScreen({
  companyName,
  companyPhoto,
  isBusy,
  theme,
  loginEmail,
  loginPassword,
  recoveryClinics,
  recoveryClinicValue,
  loginError,
  loginInfo,
  loginLoading,
  resetPasswordLoading,
  onThemeToggle,
  onLoginEmailChange,
  onLoginPasswordChange,
  onRecoveryClinicChange,
  onSubmit,
  onResetPassword,
  onStartTutorial,
  onCancelLogin,
}: LoginScreenProps) {
  const preparation = useLoginPreparation();
  if (!preparation.ready) {
    return <main className="auth-screen">
      <TechCredit />
      <ThemeToggle theme={theme} onToggle={onThemeToggle} floating />
      <LoginPreparation waiting={preparation.waiting} empty={preparation.empty} onRetry={preparation.retry} />
    </main>;
  }
  return (
    <main className="auth-screen">
      <LoginLoadingOverlay active={loginLoading} onCancel={onCancelLogin} />
      <LoadingOverlay active={isBusy && !loginLoading} />
      <TechCredit />
      <ThemeToggle theme={theme} onToggle={onThemeToggle} floating />
      <section className="auth-panel login-panel" data-tour="login-overview" inert={isBusy} aria-busy={loginLoading}>
        <div className="brand-block">
          <CompanyLogo companyName={companyName} photo={companyPhoto} className="brand-mark" />
          <div>
            <span className="eyebrow">{companyName}</span>
            <h1>Acesso ao sistema</h1>
          </div>
        </div>

        <form className="stack" onSubmit={onSubmit} onInvalid={focusFirstInvalidFormField}>
          <label data-tour="login-email">
            Email
            <input
              type="email"
              value={loginEmail}
              onChange={(event) => onLoginEmailChange(event.target.value.slice(0, MAX_EMAIL_LENGTH))}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              name="email"
              maxLength={MAX_EMAIL_LENGTH}
              required
            />
          </label>

          <div data-tour="login-password"><PasswordInput
            id="login-password"
            label="Senha"
            value={loginPassword}
            onChange={onLoginPasswordChange}
            autoComplete="current-password"
            maxLength={MAX_PASSWORD_LENGTH}
            required
          /></div>

          {recoveryClinics.length > 1 && (
            <label data-tour="password-reset-clinic">
              Clínica para recuperação de senha
              <select
                value={recoveryClinicValue}
                onChange={(event) => onRecoveryClinicChange(event.target.value)}
              >
                <option value="">Selecione uma clínica</option>
                {recoveryClinics.map((clinic) => (
                  <option key={clinic.id} value={String(clinic.id)}>{clinic.nome}</option>
                ))}
              </select>
            </label>
          )}

          {loginError && <AlertMessage type="error">{loginError}</AlertMessage>}
          {loginInfo && <ToastMessage type="success">{loginInfo}</ToastMessage>}

          <div className="login-entry-actions">
            <button className="primary-action" type="submit" disabled={loginLoading || resetPasswordLoading} data-tour="login-submit">
              <LogIn size={18} />
              {loginLoading ? 'Entrando...' : 'Entrar'}
            </button>
            <button type="button" className="ghost-button login-help-link" onClick={onResetPassword} disabled={resetPasswordLoading || loginLoading}>
              {resetPasswordLoading ? 'Enviando instruções...' : recoveryClinics.length > 1 ? 'Enviar instruções' : 'Esqueci minha senha'}
            </button>
          </div>
        </form>
        <p className="login-help">Primeiro acesso? <button type="button" className="ghost-button login-help-link" onClick={onStartTutorial}>Tutorial de acesso</button></p>
        <LegalFooter className="login-legal-footer" />
      </section>
    </main>
  );
}
