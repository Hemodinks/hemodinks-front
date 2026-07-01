import { type FormEvent, useMemo, useState } from 'react';
import { KeyRound } from 'lucide-react';
import type { Theme } from '../../appTypes';
import { CompanyLogo } from '../../shared/components/CompanyLogo';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { PasswordInput } from '../../shared/components/PasswordInput';
import { TechCredit } from '../../shared/components/TechCredit';
import { ThemeToggle } from '../../shared/components/ThemeToggle';
import {
  DEFAULT_PASSWORD,
  getErrorMessage,
  getPasswordStrength,
  MAX_PASSWORD_LENGTH,
} from '../../shared/utils/formatters';
import { confirmPasswordReset } from '../../services';
import './auth.css';

type ResetPasswordScreenProps = {
  companyName: string;
  companyPhoto?: string | null;
  theme: Theme;
  token: string;
  onThemeToggle: () => void;
  onBackToLogin: () => void;
  onResetCompleted: (message: string) => void;
};

export function ResetPasswordScreen({
  companyName,
  companyPhoto,
  theme,
  token,
  onThemeToggle,
  onBackToLogin,
  onResetCompleted,
}: ResetPasswordScreenProps) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordStrength = useMemo(() => getPasswordStrength(novaSenha), [novaSenha]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    let successMessage = '';

    if (!token.trim()) {
      setError('Link de redefinicao invalido ou incompleto.');
      return;
    }

    if (novaSenha !== confirmacao) {
      setError('A confirmacao precisa ser igual a nova senha.');
      return;
    }

    if (novaSenha === DEFAULT_PASSWORD) {
      setError('Escolha uma senha diferente da senha inicial.');
      return;
    }

    setLoading(true);

    try {
      const result = await confirmPasswordReset(token, novaSenha);
      successMessage = result.message || 'Senha redefinida com sucesso. Voce ja pode entrar com a nova senha.';
      setSuccess(successMessage);
      setNovaSenha('');
      setConfirmacao('');
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setLoading(false);
      if (successMessage) {
        onResetCompleted(successMessage);
      }
    }
  };

  return (
    <main className="auth-screen compact">
      <LoadingOverlay active={loading} />
      <TechCredit />
      <ThemeToggle theme={theme} onToggle={onThemeToggle} floating />
      <section className="auth-panel password-required">
        <div className="brand-block">
          <CompanyLogo companyName={companyName} photo={companyPhoto} className="brand-mark" />
          <div>
            <span className="eyebrow">{companyName}</span>
            <h1>Redefinir senha</h1>
          </div>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <p className="muted-text">
            Informe sua nova senha para concluir a redefinicao de acesso.
          </p>

          <PasswordInput
            id="reset-new-password"
            label="Nova senha"
            value={novaSenha}
            onChange={setNovaSenha}
            autoComplete="new-password"
            minLength={8}
            maxLength={MAX_PASSWORD_LENGTH}
            required
          />

          <div className={`password-strength strength-${passwordStrength.score}`} aria-live="polite">
            <div className="strength-track">
              <span style={{ width: `${Math.max(1, passwordStrength.score) * 20}%` }} />
            </div>
            <span>Forca da senha: {passwordStrength.label}</span>
          </div>

          <PasswordInput
            id="reset-confirm-password"
            label="Confirmar nova senha"
            value={confirmacao}
            onChange={setConfirmacao}
            autoComplete="new-password"
            minLength={8}
            maxLength={MAX_PASSWORD_LENGTH}
            required
          />

          {error && <p className="alert error">{error}</p>}
          {success && <p className="alert success">{success}</p>}

          <div className="button-row reset-password-actions">
            <button type="button" className="ghost-button" onClick={onBackToLogin}>
              Voltar ao login
            </button>
            <button className="primary-action" type="submit" disabled={loading || Boolean(success)}>
              <KeyRound size={18} />
              {loading ? 'Redefinindo...' : 'Redefinir senha'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
