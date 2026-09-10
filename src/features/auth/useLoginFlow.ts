import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { authenticate, identifyTeamOperator, listPublicClinics, resetPassword } from '../../services';
import { queryClient } from '../../queryClient';
import { getErrorMessage, isValidEmail } from '../../shared/utils/formatters';
import type { AuthSession, TeamLoginChallenge } from '../../types';
import { buildSessionFromLogin, shouldOpenDashboardAfterLogin } from '../../app/appSession';

import { useBootstrapRequest } from '../../shared/hooks/useBootstrapRequest';

type UseLoginFlowOptions = {
  session: AuthSession | null;
  persistSession: (session: AuthSession) => void;
};

export function useLoginFlow({ session, persistSession }: UseLoginFlowOptions) {
  const [loginEmail, updateLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginClinicValue, updateLoginClinicValue] = useState('');
  const loadClinics = useCallback(async (signal: AbortSignal) => {
    const clinics = await listPublicClinics('', signal);
    if (!Array.isArray(clinics)) throw new Error('Invalid public clinics response');
    return clinics;
  }, []);
  const clinicBootstrap = useBootstrapRequest(!session, loadClinics, 'public_clinics');
  const publicClinics = clinicBootstrap.data ?? [];
  const publicClinicsLoading = clinicBootstrap.loading;
  const [loginError, setLoginError] = useState('');
  const [loginInfo, setLoginInfo] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [openDashboardAfterLogin, setOpenDashboardAfterLogin] = useState(false);
  const [teamChallenge, setTeamChallenge] = useState<TeamLoginChallenge | null>(null);
  const [teamOperatorId, updateTeamOperatorId] = useState('');
  const [teamPin, setTeamPin] = useState('');
  const requestVersion = useRef(0);
  const pending = useRef(false);
  const challengeClinic = useRef('');

  const clearTeamState = () => {
    setTeamChallenge(null);
    updateTeamOperatorId('');
    setTeamPin('');
    challengeClinic.current = '';
  };
  const invalidateRequest = () => {
    requestVersion.current++;
    pending.current = false;
    setLoginLoading(false);
    setResetPasswordLoading(false);
  };
  const setLoginEmail = (value: string) => {
    invalidateRequest();
    clearTeamState();
    setLoginError('');
    setLoginInfo('');
    updateLoginEmail(value);
  };
  const setLoginClinicValue = (value: string) => {
    invalidateRequest();
    clearTeamState();
    setLoginPassword('');
    setLoginError('');
    setLoginInfo('');
    updateLoginClinicValue(value);
  };
  const setTeamOperatorId = (value: string) => {
    if (pending.current) return;
    updateTeamOperatorId(value);
    setTeamPin('');
    setLoginError('');
  };

  const selectedLoginClinic = publicClinics.find(
    (clinic) => String(clinic.id) === loginClinicValue,
  );

  useEffect(() => {
    invalidateRequest();
    clearTeamState();
    updateLoginClinicValue('');
    setLoginPassword('');
  }, [clinicBootstrap.data]);

  useEffect(() => {
    if (!teamChallenge) return;
    const remaining = new Date(teamChallenge.expiraEm).getTime() - Date.now();
    const timer = window.setTimeout(() => {
      invalidateRequest();
      clearTeamState();
      setLoginError('O prazo para identificar o funcionário terminou. Entre novamente.');
    }, Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [teamChallenge]);

  useEffect(() => () => { requestVersion.current++; }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
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

    clearTeamState();
    pending.current = true;
    const version = ++requestVersion.current;
    setLoginLoading(true);
    try {
      const result = await authenticate(loginEmail.trim(), loginPassword, selectedLoginClinic.slug);
      if (version !== requestVersion.current) return;
      setLoginPassword('');
      if (result.equipeDesafio) {
        setTeamChallenge(result.equipeDesafio);
        challengeClinic.current = selectedLoginClinic.slug;
        updateTeamOperatorId('');
        setTeamPin('');
        return;
      }
      const nextSession = buildSessionFromLogin(result);
      queryClient.clear();
      setOpenDashboardAfterLogin(shouldOpenDashboardAfterLogin(nextSession.user.perfilId));
      persistSession(nextSession);
    } catch (error) {
      if (version === requestVersion.current) setLoginError(getErrorMessage(error));
    } finally {
      if (version === requestVersion.current) {
        pending.current = false;
        setLoginPassword('');
        setLoginLoading(false);
      }
    }
  };

  const handleTeamIdentification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current || !teamChallenge || !selectedLoginClinic || !teamOperatorId) return;
    const operator = teamChallenge.operadores.find(candidate => String(candidate.id) === teamOperatorId);
    if (!operator || challengeClinic.current !== selectedLoginClinic.slug) return;
    if (new Date(teamChallenge.expiraEm).getTime() <= Date.now()) {
      clearTeamState();
      setLoginError('O prazo para identificar o funcionário terminou. Entre novamente.');
      return;
    }
    if (operator.exigePin && !/^[0-9]{6}$/.test(teamPin)) {
      setLoginError('Informe o PIN de 6 dígitos.');
      return;
    }

    pending.current = true;
    const version = ++requestVersion.current;
    setLoginLoading(true);
    setLoginError('');
    try {
      const result = await identifyTeamOperator(
        teamChallenge.token,
        Number(teamOperatorId),
        operator?.exigePin ? teamPin : null,
        challengeClinic.current,
      );
      if (version !== requestVersion.current) return;
      const nextSession = buildSessionFromLogin(result);
      queryClient.clear();
      persistSession(nextSession);
      clearTeamState();
    } catch (error) {
      if (version === requestVersion.current) setLoginError(getErrorMessage(error));
    } finally {
      if (version === requestVersion.current) {
        pending.current = false;
        setTeamPin('');
        setLoginLoading(false);
      }
    }
  };

  const handleResetPassword = async () => {
    if (pending.current) return;
    setLoginError('');
    setLoginInfo('');

    if (!isValidEmail(loginEmail)) {
      setLoginError('Informe um email valido para resetar a senha.');
      return;
    }

    pending.current = true;
    const version = ++requestVersion.current;
    setResetPasswordLoading(true);
    try {
      if (!selectedLoginClinic) {
        setLoginError('Selecione a clinica para redefinir a senha.');
        return;
      }
      const result = await resetPassword(loginEmail.trim(), selectedLoginClinic.slug);
      if (version !== requestVersion.current) return;
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
      if (version === requestVersion.current) setLoginError(getErrorMessage(error));
    } finally {
      if (version === requestVersion.current) {
        pending.current = false;
        setResetPasswordLoading(false);
      }
    }
  };

  const resetLoginState = (infoMessage = '') => {
    invalidateRequest();
    clearTeamState();
    updateLoginEmail('');
    updateLoginClinicValue('');
    setLoginError('');
    setLoginInfo(infoMessage);
    setLoginPassword('');
  };

  const cancelTeamIdentification = () => {
    invalidateRequest();
    clearTeamState();
    setLoginError('');
  };

  return {
    loginEmail,
    loginPassword,
    loginClinicValue,
    publicClinics,
    publicClinicsLoading,
    clinicBootstrap,
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
