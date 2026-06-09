import { KeyRound } from 'lucide-react';
import type { Theme } from '../../appTypes';
import type { AuthSession } from '../../types';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { PasswordForm } from '../../shared/components/PasswordForm';
import { TechCredit } from '../../shared/components/TechCredit';
import { ThemeToggle } from '../../shared/components/ThemeToggle';

type PasswordRequiredScreenProps = {
  session: AuthSession;
  isBusy: boolean;
  theme: Theme;
  onThemeToggle: () => void;
  onPasswordChanged: (message: string) => void;
  onLogout: () => void;
};

export function PasswordRequiredScreen({
  session,
  isBusy,
  theme,
  onThemeToggle,
  onPasswordChanged,
  onLogout,
}: PasswordRequiredScreenProps) {
  return (
    <main className="auth-screen compact">
      <LoadingOverlay active={isBusy} />
      <TechCredit />
      <ThemeToggle theme={theme} onToggle={onThemeToggle} floating />
      <section className="auth-panel password-required">
        <div className="brand-block">
          <KeyRound size={36} strokeWidth={1.8} />
          <div>
            <span className="eyebrow">Primeiro acesso</span>
            <h1>Troque sua senha</h1>
          </div>
        </div>

        <PasswordForm
          session={session}
          forced
          onChanged={onPasswordChanged}
          onCancel={onLogout}
        />
      </section>
    </main>
  );
}
