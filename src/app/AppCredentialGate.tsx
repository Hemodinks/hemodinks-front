import type { Theme } from '../appTypes';
import { PasswordRequiredScreen } from '../features/auth/PasswordRequiredScreen';
import { TeamPinRequiredScreen } from '../features/auth/TeamPinRequiredScreen';
import type { AuthSession } from '../types';

type AppCredentialGateProps = {
  session: AuthSession;
  theme: Theme;
  isBusy: boolean;
  onThemeToggle: () => void;
  onPasswordChanged: (token: string) => void;
  onPinChanged: (token: string) => void;
  onLogout: () => void;
};

export function AppCredentialGate({
  session,
  theme,
  isBusy,
  onThemeToggle,
  onPasswordChanged,
  onPinChanged,
  onLogout,
}: AppCredentialGateProps) {
  if (session.user.precisaTrocarSenha) {
    return (
      <PasswordRequiredScreen
        session={session}
        isBusy={isBusy}
        theme={theme}
        onThemeToggle={onThemeToggle}
        onPasswordChanged={onPasswordChanged}
        onLogout={onLogout}
      />
    );
  }

  return (
    <TeamPinRequiredScreen
      session={session}
      theme={theme}
      onThemeToggle={onThemeToggle}
      onChanged={onPinChanged}
      onLogout={onLogout}
    />
  );
}
