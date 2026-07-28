import { LoginScreen } from '../features/auth/LoginScreen';
import { PasswordRequiredScreen } from '../features/auth/PasswordRequiredScreen';
import { ResetPasswordScreen } from '../features/auth/ResetPasswordScreen';
import type { useLoginFlow } from '../features/auth/useLoginFlow';
import type { AuthSession } from '../shared/domain/sessionTypes';
import type { Theme } from '../appTypes';
import type { UsersDomainState } from '../features/users/useUsersDomain';
import type { AppChromeState } from './useAppChrome';
import type { useSessionLifecycle } from './useSessionLifecycle';

type AppSessionScreensProps = {
  session: AuthSession | null;
  isResetPasswordRoute: boolean;
  resetToken: string;
  isBusy: boolean;
  theme: Theme;
  toggleTheme: () => void;
  appChrome: AppChromeState;
  loginFlow: ReturnType<typeof useLoginFlow>;
  usersDomain: UsersDomainState;
  sessionLifecycle: ReturnType<typeof useSessionLifecycle>;
};

export function AppSessionScreens({
  session,
  isResetPasswordRoute,
  resetToken,
  isBusy,
  theme,
  toggleTheme,
  appChrome,
  loginFlow,
  usersDomain,
  sessionLifecycle,
}: AppSessionScreensProps) {
  if (!session && isResetPasswordRoute) {
    return (
      <ResetPasswordScreen
        companyName={appChrome.companyName}
        companyPhoto={appChrome.systemSettings.fotoEmpresa}
        theme={theme}
        token={resetToken}
        onThemeToggle={toggleTheme}
        onBackToLogin={() => loginFlow.returnToLogin()}
        onResetCompleted={loginFlow.handleResetPasswordCompleted}
      />
    );
  }

  if (!session) {
    return (
      <LoginScreen
        companyName={loginFlow.companyName}
        companyPhoto={loginFlow.companyPhoto}
        isBusy={isBusy}
        theme={theme}
        loginEmail={loginFlow.loginEmail}
        loginPassword={loginFlow.loginPassword}
        loginClinicValue={loginFlow.loginClinicValue}
        clinics={loginFlow.publicClinics}
        clinicsLoading={loginFlow.publicClinicsLoading}
        loginError={loginFlow.loginError}
        loginInfo={loginFlow.loginInfo}
        loginLoading={loginFlow.loginLoading}
        resetPasswordLoading={loginFlow.resetPasswordLoading}
        onThemeToggle={toggleTheme}
        onLoginEmailChange={loginFlow.setLoginEmail}
        onLoginPasswordChange={loginFlow.setLoginPassword}
        onLoginClinicChange={loginFlow.setLoginClinicValue}
        onSubmit={loginFlow.handleLogin}
        onResetPassword={() => void loginFlow.handleResetPassword()}
      />
    );
  }

  return (
    <PasswordRequiredScreen
      session={session}
      isBusy={isBusy}
      theme={theme}
      onThemeToggle={toggleTheme}
      onPasswordChanged={usersDomain.handlePasswordChanged}
      onLogout={sessionLifecycle.logout}
    />
  );
}
