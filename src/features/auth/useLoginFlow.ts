import { type FormEvent, useEffect, useState } from 'react';
import { authenticate, identifyTeamOperator, listPublicClinics, resetPassword } from '../../services';
import { queryClient } from '../../queryClient';
import { getErrorMessage, isValidEmail } from '../../shared/utils/formatters';
import type { AuthSession, PublicClinic, TeamLoginChallenge } from '../../types';
import { buildSessionFromLogin, shouldOpenDashboardAfterLogin } from '../../app/appSession';

type UseLoginFlowOptions = {
  session: AuthSession | null;
  persistSession: (session: AuthSession) => void;
};

export function useLoginFlow({ session, persistSession }: UseLoginFlowOptions) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginClinicValue, setLoginClinicValue] = useState('');
  const [publicClinics, setPublicClinics] = useState<PublicClinic[]>([]);
  const [publicClinicsLoading, setPublicClinicsLoading] = useState(!session);
  const [loginError, setLoginError] = useState('');
  const [loginInfo, setLoginInfo] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [openDashboardAfterLogin, setOpenDashboardAfterLogin] = useState(false);
  const [teamChallenge, setTeamChallenge] = useState<TeamLoginChallenge | null>(null);
  const [teamOperatorId, setTeamOperatorId] = useState('');
  const [teamPin, setTeamPin] = useState('');

  const selectedLoginClinic = publicClinics.find(
    (clinic) => String(clinic.id) === loginClinicValue,
  );

  useEffect(() => {
    if (session) return;

    let cancelled = false;
    setPublicClinicsLoading(true);
    void listPublicClinics()
      .then((clinics) => {
        if (cancelled) return;
        if (!Array.isArray(clinics)) {
          setPublicClinics([]);
          setLoginError('Não foi possível carregar as clínicas cadastradas.');
          return;
        }
        setPublicClinics(clinics);
        setLoginClinicValue('');
      })
      .catch((error) => {
        if (!cancelled) setLoginError(getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setPublicClinicsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

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

    setLoginLoading(true);
    try {
      const result = await authenticate(loginEmail.trim(), loginPassword, selectedLoginClinic.slug);
      if (result.equipeDesafio) {
        setTeamChallenge(result.equipeDesafio);
        setTeamOperatorId('');
        setTeamPin('');
        return;
      }
      const nextSession = buildSessionFromLogin(result);
      queryClient.clear();
      setOpenDashboardAfterLogin(shouldOpenDashboardAfterLogin(nextSession.user.perfilId));
      persistSession(nextSession);
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleTeamIdentification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!teamChallenge || !selectedLoginClinic || !teamOperatorId) return;

    setLoginLoading(true);
    setLoginError('');
    try {
      const operator = teamChallenge.operadores.find(
        (candidate) => String(candidate.id) === teamOperatorId,
      );
      const result = await identifyTeamOperator(
        teamChallenge.token,
        Number(teamOperatorId),
        operator?.exigePin ? teamPin : null,
        selectedLoginClinic.slug,
      );
      const nextSession = buildSessionFromLogin(result);
      queryClient.clear();
      persistSession(nextSession);
      setTeamChallenge(null);
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoginError('');
    setLoginInfo('');

    if (!isValidEmail(loginEmail)) {
      setLoginError('Informe um email valido para resetar a senha.');
      return;
    }

    setResetPasswordLoading(true);
    try {
      if (!selectedLoginClinic) {
        setLoginError('Selecione a clinica para redefinir a senha.');
        return;
      }
      const result = await resetPassword(loginEmail.trim(), selectedLoginClinic.slug);
      if (result.mode === 'default-password') {
        setLoginPassword('');
        setLoginInfo(
          'A senha foi redefinida. Use a credencial temporária fornecida pela clínica e altere-a após entrar.',
        );
        return;
      }
      setLoginPassword('');
      setLoginInfo(
        result.message || 'Se o email estiver cadastrado, enviaremos as instrucoes para redefinir a senha.',
      );
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const resetLoginState = (infoMessage = '') => {
    setLoginError('');
    setLoginInfo(infoMessage);
    setLoginPassword('');
  };

  const cancelTeamIdentification = () => {
    setTeamChallenge(null);
    setTeamPin('');
    setLoginError('');
  };

  return {
    loginEmail,
    loginPassword,
    loginClinicValue,
    publicClinics,
    publicClinicsLoading,
    loginError,
    loginInfo,
    loginLoading,
    resetPasswordLoading,
    openDashboardAfterLogin,
    teamChallenge,
    teamOperatorId,
    teamPin,
    selectedLoginClinic,
    setLoginEmail,
    setLoginPassword,
    setLoginClinicValue,
    setLoginError,
    setOpenDashboardAfterLogin,
    setTeamOperatorId,
    setTeamPin,
    handleLogin,
    handleTeamIdentification,
    handleResetPassword,
    resetLoginState,
    cancelTeamIdentification,
  };
}

export type LoginFlowState = ReturnType<typeof useLoginFlow>;
