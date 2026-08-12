import type { Theme } from '../appTypes';
import { LoginScreen } from '../features/auth/LoginScreen';
import { ResetPasswordScreen } from '../features/auth/ResetPasswordScreen';
import { TeamIdentificationScreen } from '../features/auth/TeamIdentificationScreen';
import type { LoginFlowState } from '../features/auth/useLoginFlow';
import { API_ASSET_BASE_URL } from '../shared/utils/formatters';
import { useTutorials } from '../features/tutorials/TutorialProvider';

type AppPublicContentProps = {
  loginFlow: LoginFlowState;
  isResetPasswordRoute: boolean;
  resetToken: string;
  companyName: string;
  companyPhoto?: string | null;
  theme: Theme;
  isBusy: boolean;
  onThemeToggle: () => void;
  onBackToLogin: () => void;
  onResetCompleted: (message: string) => void;
};

export function AppPublicContent({
  loginFlow,
  isResetPasswordRoute,
  resetToken,
  companyName,
  companyPhoto,
  theme,
  isBusy,
  onThemeToggle,
  onBackToLogin,
  onResetCompleted,
}: AppPublicContentProps) {
  const { startTutorial } = useTutorials();
  if (isResetPasswordRoute) {
    return (
      <ResetPasswordScreen
        companyName={companyName}
        companyPhoto={companyPhoto}
        theme={theme}
        token={resetToken}
        onThemeToggle={onThemeToggle}
        onBackToLogin={onBackToLogin}
        onResetCompleted={onResetCompleted}
      />
    );
  }

  if (loginFlow.teamChallenge) {
    return (
      <TeamIdentificationScreen
        challenge={loginFlow.teamChallenge}
        operatorId={loginFlow.teamOperatorId}
        pin={loginFlow.teamPin}
        error={loginFlow.loginError}
        loading={loginFlow.loginLoading}
        theme={theme}
        onOperatorChange={loginFlow.setTeamOperatorId}
        onPinChange={loginFlow.setTeamPin}
        onSubmit={loginFlow.handleTeamIdentification}
        onBack={loginFlow.cancelTeamIdentification}
        onThemeToggle={onThemeToggle}
      />
    );
  }

  return (
    <LoginScreen
      companyName={loginFlow.selectedLoginClinic?.nome ?? companyName}
      companyPhoto={loginFlow.selectedLoginClinic?.fotoUrl
        ? `${API_ASSET_BASE_URL}${loginFlow.selectedLoginClinic.fotoUrl}`
        : null}
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
      onThemeToggle={onThemeToggle}
      onLoginEmailChange={loginFlow.setLoginEmail}
      onLoginPasswordChange={loginFlow.setLoginPassword}
      onLoginClinicChange={loginFlow.setLoginClinicValue}
      onSubmit={loginFlow.handleLogin}
      onResetPassword={() => void loginFlow.handleResetPassword()}
      onStartTutorial={() => startTutorial('login-clinic')}
    />
  );
}
