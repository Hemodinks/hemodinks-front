import { isPasswordPolicyError } from '../../services/passwordPolicyError';
import { readSensitiveIdentityError } from '../../services/sensitiveIdentityError';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { changePassword } from '../../services';
import { completeTemporaryPassword } from '../../services/usersService';
import { decodeJwtPayload } from '../utils/jwt';
import type { AuthSession } from '../../types';
import {
  getErrorMessage,
  getPasswordStrength,
  MAX_PASSWORD_LENGTH,
} from '../utils/formatters';
import { PasswordInput } from './PasswordInput';
import { AlertMessage } from './ui';
import { focusFirstInvalidFormField } from '../utils/focusInvalidFormField';

type PasswordFormProps = {
  session: AuthSession;
  forced?: boolean;
  onChanged: (message: string) => void;
  onCancel?: () => void;
};

export function PasswordForm({ session, forced = false, onChanged, onCancel }: PasswordFormProps) {
  const temporaryRecovery = decodeJwtPayload(session.token)?.temporary_password === 'true';
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const passwordStrength = useMemo(() => getPasswordStrength(novaSenha), [novaSenha]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    setPasswordError(false);
    setCurrentPasswordError(false);

    if (novaSenha !== confirmacao) {
      setError('A confirmacao precisa ser igual a nova senha.');
      return;
    }

    setLoading(true);

    try {
      if (temporaryRecovery) {
        await completeTemporaryPassword(novaSenha, confirmacao, session.token);
        setNovaSenha('');
        setConfirmacao('');
        onCancel?.();
        return;
      }
      const result = await changePassword(session.user.id, { senhaAtual, novaSenha }, session.token);
      if (!active.current) return;
      setSenhaAtual(''); setNovaSenha(''); setConfirmacao('');
      onChanged(result.message);
    } catch (submitError) {
      if (!active.current) return;
      if (readSensitiveIdentityError(submitError)) {
        setSenhaAtual(''); setNovaSenha(''); setConfirmacao('');
        setCurrentPasswordError(true);
      }
      setPasswordError(isPasswordPolicyError(submitError));
      setError(getErrorMessage(submitError));
    } finally {
      if (active.current) setLoading(false);
    }
  };

  return (
    <form data-private="true" className="stack sentry-block nr-block" onSubmit={handleSubmit} onInvalid={focusFirstInvalidFormField}>
      {forced && (
        <p className="alert warning">
          A senha temporária precisa ser alterada para liberar o acesso.
        </p>
      )}

      {!temporaryRecovery && <PasswordInput
        id="current-password"
        label="Senha atual"
        value={senhaAtual}
        onChange={setSenhaAtual}
        errorId={currentPasswordError ? 'new-password-api-error' : undefined}
        autoComplete="current-password"
        maxLength={MAX_PASSWORD_LENGTH}
        required
      />}

      <PasswordInput
        id="new-password"
        label="Nova senha"
        value={novaSenha}
        onChange={(value) => { setNovaSenha(value); if (passwordError) { setError(''); setPasswordError(false); } }}
        errorId={passwordError ? 'new-password-api-error' : undefined}
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
        id="confirm-password"
        label="Confirmar nova senha"
        value={confirmacao}
        onChange={setConfirmacao}
        autoComplete="new-password"
        minLength={8}
        maxLength={MAX_PASSWORD_LENGTH}
        required
      />

      {error && <div id="new-password-api-error"><AlertMessage type="error">{error}</AlertMessage></div>}
      <p>Após salvar, entre novamente com sua nova senha.</p>

      <div className="button-row">
        {onCancel && (
          <button type="button" className="ghost-button" onClick={onCancel}>
            <X size={17} />
            {forced ? 'Sair' : 'Cancelar'}
          </button>
        )}
        <button className="primary-action" type="submit" disabled={loading}>
          <KeyRound size={18} />
          {loading ? 'Alterando...' : 'Alterar senha'}
        </button>
      </div>
    </form>
  );
}
