import { type FormEvent, useEffect, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { authenticate, listPublicClinics, resetPassword } from '../../services';
import { queryClient } from '../../queryClient';
import { API_ASSET_BASE_URL, getErrorMessage, isValidEmail } from '../../shared/utils/formatters';
import { useAsyncOperation } from '../../shared/hooks/useAsyncOperation';
import type { AuthSession } from './authTypes';
import type { PublicClinic } from '../../shared/domain/clinicalContracts';
import {
  buildSessionFromLogin,
  getResetPasswordCompletedMessage,
  shouldOpenDashboardAfterLogin,
} from '../../app/appSession';

type LoginFlowOptions = {
  session: AuthSession | null;
  persistSession: (session: AuthSession) => void;
  navigate: NavigateFunction;
  fallbackCompanyName: string;
  fallbackCompanyPhoto?: string | null;
};

export function useLoginFlow({
  session,
  persistSession,
  navigate,
  fallbackCompanyName,
  fallbackCompanyPhoto,
}: LoginFlowOptions) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginClinicValue, setLoginClinicValue] = useState('');
  const [publicClinics, setPublicClinics] = useState<PublicClinic[]>([]);
  const [loginError, setLoginError] = useState('');
  const [loginInfo, setLoginInfo] = useState('');
  const [openDashboardAfterLogin, setOpenDashboardAfterLogin] = useState(false);
  const selectedLoginClinic = publicClinics.find(
    (clinic) => String(clinic.id) === loginClinicValue,
  );
  const publicClinicsOperation = useAsyncOperation(() => listPublicClinics());
  const loginOperation = useAsyncOperation(
    (_signal, email: string, password: string, clinicSlug: string) =>
      authenticate(email, password, clinicSlug),
  );
  const resetPasswordOperation = useAsyncOperation((_signal, email: string, clinicSlug: string) =>
    resetPassword(email, clinicSlug),
  );

  useEffect(() => {
    if (session) return;

    let active = true;
    void publicClinicsOperation
      .execute()
      .then((clinics) => {
        if (!active) return;
        setPublicClinics(clinics);
        if (clinics.length === 1) {
          setLoginClinicValue(String(clinics[0].id));
        }
      })
      .catch((error) => {
        if (active) setLoginError(getErrorMessage(error));
      });

    return () => {
      active = false;
      publicClinicsOperation.cancel();
    };
  }, [session]);

  useEffect(() => {
    if (session) {
      publicClinicsOperation.reset();
    }
  }, [session]);

  const returnToLogin = (infoMessage = '') => {
    setLoginError('');
    setLoginInfo(infoMessage);
    setLoginPassword('');
    navigate('/', { replace: true });
  };

  const handleResetPasswordCompleted = (message: string) => {
    returnToLogin(getResetPasswordCompletedMessage(message));
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');
    setLoginInfo('');

    if (!isValidEmail(loginEmail)) {
      setLoginError('Informe um email valido.');
      return;
    }
    if (!selectedLoginClinic) {
      setLoginError('Selecione uma clinica cadastrada.');
      return;
    }

    try {
      const result = await loginOperation.execute(
        loginEmail.trim(),
        loginPassword,
        selectedLoginClinic.slug,
      );
      const nextSession = buildSessionFromLogin(result);
      queryClient.clear();
      setOpenDashboardAfterLogin(shouldOpenDashboardAfterLogin(nextSession.user.perfilId));
      persistSession(nextSession);
    } catch (error) {
      setLoginError(getErrorMessage(error));
    }
  };

  const handleResetPassword = async () => {
    setLoginError('');
    setLoginInfo('');

    if (!isValidEmail(loginEmail)) {
      setLoginError('Informe um email valido para resetar a senha.');
      return;
    }

    try {
      if (!selectedLoginClinic) {
        setLoginError('Selecione a clinica para redefinir a senha.');
        return;
      }
      const result = await resetPasswordOperation.execute(
        loginEmail.trim(),
        selectedLoginClinic.slug,
      );

      setLoginPassword('');
      setLoginInfo(
        result.message ||
          'Se o email estiver cadastrado, enviaremos as instrucoes para redefinir a senha.',
      );
    } catch (error) {
      setLoginError(getErrorMessage(error));
    }
  };

  const companyName = selectedLoginClinic?.nome ?? fallbackCompanyName;
  const companyPhoto = selectedLoginClinic?.fotoUrl
    ? `${API_ASSET_BASE_URL}${selectedLoginClinic.fotoUrl}`
    : fallbackCompanyPhoto;

  return {
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    loginClinicValue,
    setLoginClinicValue,
    publicClinics,
    publicClinicsLoading: publicClinicsOperation.isLoading,
    loginError,
    setLoginError,
    loginInfo,
    setLoginInfo,
    loginLoading: loginOperation.isLoading,
    resetPasswordLoading: resetPasswordOperation.isLoading,
    openDashboardAfterLogin,
    setOpenDashboardAfterLogin,
    companyName,
    companyPhoto,
    returnToLogin,
    handleResetPasswordCompleted,
    handleLogin,
    handleResetPassword,
  };
}

export type LoginFlowState = ReturnType<typeof useLoginFlow>;
