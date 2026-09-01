import { type FormEvent, useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import type { Theme } from '../../appTypes';
import type { PublicClinic } from '../../types';
import { CompanyLogo } from '../../shared/components/CompanyLogo';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { PasswordInput } from '../../shared/components/PasswordInput';
import { TechCredit } from '../../shared/components/TechCredit';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import { ToastMessage } from '../../shared/components/ui';
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
  onStartTutorial: () => void;
};

const INITIAL_LOADING_STEPS = [
  'Conectando com segurança…',
  'Carregando os dados da clínica…',
  'Preparando seu painel…',
  'Tudo quase pronto…',
];

function LoginInitialLoadingMessage() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % INITIAL_LOADING_STEPS.length);
    }, 2600);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="login-initial-loading-copy">
      <strong>Preparando seu acesso</strong>
      <span>Bem-vindo ao Hemodinks!</span>
      <p>Estamos iniciando os serviços e carregando as informações da sua clínica.</p>
      <span className="login-initial-loading-step" aria-atomic="true">
        <i aria-hidden="true" />
        {INITIAL_LOADING_STEPS[stepIndex]}
      </span>
      <small>Na primeira conexão, isso pode levar até 1 minuto. Você será direcionado automaticamente.</small>
    </div>
  );
}

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
  onStartTutorial,
}: LoginScreenProps) {
  return (
    <main className="auth-screen">
      <LoadingOverlay
        active={isBusy || clinicsLoading}
        className={clinicsLoading ? 'login-initial-loading' : undefined}
        eyebrow={clinicsLoading ? 'Iniciando o sistema' : undefined}
        message={clinicsLoading ? <LoginInitialLoadingMessage /> : undefined}
      />
      <TechCredit />
      <ThemeToggle theme={theme} onToggle={onThemeToggle} floating />
      <section className="auth-panel" data-tour="login-overview">
        <div className="brand-block">
          {loginClinicValue
            ? <CompanyLogo companyName={companyName} photo={companyPhoto} className="brand-mark" />
            : <span className="brand-mark login-brand-placeholder" aria-hidden="true" />}
          <div>
            <span className="eyebrow">{companyName}</span>
            <h1>Acesso ao sistema</h1>
          </div>
        </div>

        <button type="button" className="ghost-button login-tutorial-button" onClick={onStartTutorial}>Tutorial de acesso</button>

        <form className="stack" onSubmit={onSubmit}>
          <label data-tour="login-clinic">
            Clínica
            <select
              value={loginClinicValue}
              onChange={(event) => onLoginClinicChange(event.target.value)}
              disabled={clinicsLoading}
              required
            >
              <option value="">
                {clinicsLoading ? 'Carregando clínicas...' : 'Selecione uma clínica'}
              </option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={String(clinic.id)}>{clinic.nome}</option>
              ))}
            </select>
          </label>

          <label data-tour="login-email">
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

          <div data-tour="login-password"><PasswordInput
            id="login-password"
            label="Senha"
            value={loginPassword}
            onChange={onLoginPasswordChange}
            autoComplete="current-password"
            maxLength={MAX_PASSWORD_LENGTH}
            required
          /></div>

          {loginError && <p className="alert error">{loginError}</p>}
          {loginInfo && <ToastMessage type="success">{loginInfo}</ToastMessage>}

          <div className="button-row login-actions">
            <button type="button" className="ghost-button" onClick={onResetPassword} disabled={resetPasswordLoading}>
              {resetPasswordLoading ? 'Resetando...' : 'Esqueci minha senha'}
            </button>
            <button className="primary-action" type="submit" disabled={loginLoading} data-tour="login-submit">
              <LogIn size={18} />
              {loginLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
