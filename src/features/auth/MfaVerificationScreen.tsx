import { type FormEvent, useEffect, useRef } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import type { Theme } from "../../appTypes";
import { LoginLoadingOverlay } from './LoginLoadingOverlay';
import { AuthWaitMessage } from './AuthWaitMessage';
import { TechCredit } from "../../shared/components/TechCredit";
import { ThemeToggle } from "../../shared/components/ThemeToggle";
import { AlertMessage } from "../../shared/components/ui";
import { focusFirstInvalidFormField } from "../../shared/utils/focusInvalidFormField";
import { MFA_CODE_MAX_LENGTH, MFA_TOTP_LENGTH, isCompleteMfaCode } from "../../shared/utils/mfaCode";
import "./auth.css";
import "./mfaVerification.css";

type MfaVerificationScreenProps = {
  code: string;
  error: string;
  loading: boolean;
  waitSeconds?: number;
  waitMessage?: string;
  theme: Theme;
  onCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  onCancelLogin: () => void;
  onThemeToggle: () => void;
};

// #150: segundo passo do login para quem ativou a verificacao em duas etapas.
export function MfaVerificationScreen({
  code,
  error,
  loading,
  waitSeconds = 0,
  waitMessage = '',
  theme,
  onCodeChange,
  onSubmit,
  onBack,
  onCancelLogin,
  onThemeToggle,
}: MfaVerificationScreenProps) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!loading) input.current?.focus();
  }, [loading]);
  return (
    <main className="auth-screen">
      <LoginLoadingOverlay active={loading} stage="Confirmando o código…" onCancel={onCancelLogin} />
      <TechCredit />
      <ThemeToggle theme={theme} onToggle={onThemeToggle} floating />
      <section className="auth-panel login-panel mfa-verification-panel" aria-busy={loading}>
        <div className="brand-block">
          <span className="brand-mark mfa-verification-icon" aria-hidden="true">
            <ShieldCheck size={28} />
          </span>
          <div>
            <span className="eyebrow">Verificação em duas etapas</span>
            <h1>Confirme o acesso</h1>
          </div>
        </div>
        <p className="team-login-description">Abra o aplicativo autenticador e informe o código de 6 dígitos.
          Sem o celular, use um dos códigos de recuperação.</p>
        <form className="stack" onSubmit={onSubmit} onInvalid={focusFirstInvalidFormField}>
          <label htmlFor="mfa-code">Código
            <input
              ref={input}
              id="mfa-code"
              type="text"
              className="mfa-code-input"
              inputMode="text"
              placeholder="000000"
              aria-describedby="mfa-code-hint"
              value={code}
              onChange={(event) => onCodeChange(event.target.value)}
              autoComplete="one-time-code"
              minLength={MFA_TOTP_LENGTH}
              maxLength={MFA_CODE_MAX_LENGTH}
              spellCheck={false}
              autoCapitalize="characters"
              required
              disabled={loading}
            />
          </label>
          <p id="mfa-code-hint" className="mfa-code-hint">6 dígitos do aplicativo ou código de recuperação <span className="mfa-code-format">(XXXXX-XXXXX)</span>.</p>
          {error && <AlertMessage type="error">{error}</AlertMessage>}
          <AuthWaitMessage message={waitMessage} />
          <div className="button-row login-actions">
            <button type="button" className="ghost-button" onClick={onBack}>
              Voltar
            </button>
            <button className="primary-action" type="submit" disabled={loading || waitSeconds > 0 || !isCompleteMfaCode(code)}
              aria-describedby={waitMessage ? 'auth-wait-status' : undefined}>
              <LogIn size={18} />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
