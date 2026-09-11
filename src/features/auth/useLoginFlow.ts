import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  authenticate,
  identifyTeamOperator,
  listPublicClinics,
  resetPassword,
  resolveLoginClinics,
  type LoginClinicOption,
} from '../../services';
import { queryClient } from '../../queryClient';
import { getErrorMessage, isValidEmail } from '../../shared/utils/formatters';
import type { AuthSession, PublicClinic, TeamLoginChallenge } from '../../types';
import { buildSessionFromLogin, shouldOpenDashboardAfterLogin } from '../../app/appSession';
import { getLoginErrorMessage } from './loginFeedback';

type UseLoginFlowOptions = {
  session: AuthSession | null;
  persistSession: (session: AuthSession) => void;
};

export function useLoginFlow({ session, persistSession }: UseLoginFlowOptions) {
  const [loginEmail, updateLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginClinicOptions, setLoginClinicOptions] = useState<LoginClinicOption[]>([]);
  const [activeLoginClinic, setActiveLoginClinic] = useState<LoginClinicOption | null>(null);
  const [recoveryClinics, setRecoveryClinics] = useState<PublicClinic[]>([]);
  const [recoveryClinicValue, setRecoveryClinicValue] = useState('');
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
  const activeRequest = useRef<AbortController | null>(null);

  const clearTeamState = () => {
    setTeamChallenge(null);
    updateTeamOperatorId('');
    setTeamPin('');
    challengeClinic.current = '';
  };

  const clearClinicSelection = () => {
    setLoginClinicOptions([]);
    setActiveLoginClinic(null);
  };

  const clearRecoveryState = () => {
    setRecoveryClinics([]);
    setRecoveryClinicValue('');
  };

  const invalidateRequest = () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    requestVersion.current++;
    pending.current = false;
    setLoginLoading(false);
    setResetPasswordLoading(false);
  };

  const setLoginEmail = (value: string) => {
    invalidateRequest();
    clearTeamState();
    clearClinicSelection();
    clearRecoveryState();
    setLoginError('');
    setLoginInfo('');
    updateLoginEmail(value);
  };

  const setTeamOperatorId = (value: string) => {
    if (pending.current) return;
    updateTeamOperatorId(value);
    setTeamPin('');
    setLoginError('');
  };

  useEffect(() => {
    if (!teamChallenge) return;
    const remaining = new Date(teamChallenge.expiraEm).getTime() - Date.now();
    const timer = window.setTimeout(() => {
      invalidateRequest();
      clearTeamState();
      clearClinicSelection();
      setLoginPassword('');
      setLoginError('O prazo para identificar o funcionário terminou. Entre novamente.');
    }, Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [teamChallenge]);

  useEffect(() => () => { requestVersion.current++; activeRequest.current?.abort(); }, []);

  const completeAuthentication = async (clinic: LoginClinicOption, version: number, signal: AbortSignal) => {
    const result = await authenticate(loginEmail.trim(), loginPassword, clinic.slug, signal);
    if (version !== requestVersion.current) return;

    setActiveLoginClinic(clinic);
    setLoginClinicOptions([]);
    setLoginPassword('');

    if (result.equipeDesafio) {
      setTeamChallenge(result.equipeDesafio);
      challengeClinic.current = clinic.slug;
      updateTeamOperatorId('');
      setTeamPin('');
      return;
    }

    const nextSession = buildSessionFromLogin(result);
    queryClient.clear();
    setOpenDashboardAfterLogin(shouldOpenDashboardAfterLogin(nextSession.user.perfilId));
    persistSession(nextSession);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    setLoginError('');
    setLoginInfo('');
    clearTeamState();
    clearClinicSelection();
    clearRecoveryState();

    if (!isValidEmail(loginEmail)) {
      setLoginError('Informe um email valido.');
      return;
    }

    if (!loginPassword) {
      setLoginError('Informe a senha.');
      return;
    }

    pending.current = true;
    const version = ++requestVersion.current;
    setLoginLoading(true);

    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const context = await resolveLoginClinics(loginEmail.trim(), loginPassword, controller.signal);
      if (version !== requestVersion.current) return;

      const clinics = Array.isArray(context.clinicas) ? context.clinicas : [];
      if (clinics.length === 0) {
        throw new Error('Credenciais invalidas.');
      }

      if (clinics.length === 1) {
        await completeAuthentication(clinics[0], version, controller.signal);
        return;
      }

      setLoginClinicOptions(clinics);
      setActiveLoginClinic(null);
      // A senha permanece apenas em memória até a escolha da clínica.
      // Não é persistida em localStorage/sessionStorage.
    } catch (error) {
      if (version === requestVersion.current) {
        setLoginPassword('');
        setLoginError(getLoginErrorMessage(error));
      }
    } finally {
      if (version === requestVersion.current) {
        activeRequest.current = null;
        pending.current = false;
        setLoginLoading(false);
      }
    }
  };

  const selectLoginClinic = async (clinicaId: number) => {
    if (pending.current || loginClinicOptions.length < 2) return;
    const clinic = loginClinicOptions.find(candidate => candidate.clinicaId === clinicaId);
    if (!clinic || !loginPassword) {
      setLoginError('Sua autenticação expirou. Entre novamente.');
      setLoginPassword('');
      clearClinicSelection();
      return;
    }

    pending.current = true;
    const version = ++requestVersion.current;
    setLoginLoading(true);
    setLoginError('');
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      // A escolha do browser nunca é tratada como autorização: o endpoint
      // tenant-scoped existente autentica novamente a mesma credencial.
      await completeAuthentication(clinic, version, controller.signal);
    } catch (error) {
      if (version === requestVersion.current) {
        setLoginPassword('');
        clearClinicSelection();
        setLoginError(getLoginErrorMessage(error));
      }
    } finally {
      if (version === requestVersion.current) {
        activeRequest.current = null;
        pending.current = false;
        setLoginLoading(false);
      }
    }
  };

  const cancelClinicSelection = () => {
    invalidateRequest();
    clearClinicSelection();
    clearTeamState();
    setLoginPassword('');
    setLoginError('');
  };

  const cancelPendingLogin = () => {
    cancelClinicSelection();
    setLoginInfo('Tentativa de acesso cancelada. Você pode entrar novamente quando quiser.');
  };

  const handleTeamIdentification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current || !teamChallenge || !teamOperatorId || !challengeClinic.current) return;
    const operator = teamChallenge.operadores.find(candidate => String(candidate.id) === teamOperatorId);
    if (!operator) return;
    if (new Date(teamChallenge.expiraEm).getTime() <= Date.now()) {
      clearTeamState();
      clearClinicSelection();
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
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const result = await identifyTeamOperator(
        teamChallenge.token,
        Number(teamOperatorId),
        operator.exigePin ? teamPin : null,
        challengeClinic.current,
        controller.signal,
      );
      if (version !== requestVersion.current) return;
      const nextSession = buildSessionFromLogin(result);
      queryClient.clear();
      persistSession(nextSession);
      clearTeamState();
      clearClinicSelection();
    } catch (error) {
      if (version === requestVersion.current) setLoginError(getLoginErrorMessage(error));
    } finally {
      if (version === requestVersion.current) {
        activeRequest.current = null;
        pending.current = false;
        setTeamPin('');
        setLoginLoading(false);
      }
    }
  };

  const executePasswordReset = async (clinic: PublicClinic, version: number) => {
    const result = await resetPassword(loginEmail.trim(), clinic.slug);
    if (version !== requestVersion.current) return;
    clearRecoveryState();
    setLoginPassword('');
    if (result.mode === 'default-password') {
      setLoginInfo('A senha foi redefinida. Use a credencial temporária fornecida pela clínica e altere-a após entrar.');
      return;
    }
    setLoginInfo(result.message || 'Se o email estiver cadastrado, enviaremos as instrucoes para redefinir a senha.');
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
      if (recoveryClinics.length > 1) {
        const selected = recoveryClinics.find(item => String(item.id) === recoveryClinicValue);
        if (!selected) {
          setLoginError('Selecione a clínica para redefinir a senha.');
          return;
        }
        await executePasswordReset(selected, version);
        return;
      }

      const clinics = await listPublicClinics();
      if (version !== requestVersion.current) return;
      if (clinics.length === 1) {
        await executePasswordReset(clinics[0], version);
        return;
      }
      if (clinics.length > 1) {
        setRecoveryClinics(clinics);
        setRecoveryClinicValue('');
        return;
      }

      // Mantém resposta não enumerável quando não há contexto recuperável.
      setLoginInfo('Se o email estiver cadastrado, enviaremos as instrucoes para redefinir a senha.');
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
    clearClinicSelection();
    clearRecoveryState();
    updateLoginEmail('');
    setLoginError('');
    setLoginInfo(infoMessage);
    setLoginPassword('');
  };

  const cancelTeamIdentification = () => {
    invalidateRequest();
    clearTeamState();
    clearClinicSelection();
    setLoginError('');
  };

  return {
    loginEmail,
    loginPassword,
    loginClinicOptions,
    activeLoginClinic,
    recoveryClinics,
    recoveryClinicValue,
    loginError,
    loginInfo,
    loginLoading,
    resetPasswordLoading,
    openDashboardAfterLogin,
    teamChallenge,
    teamOperatorId,
    teamPin,
    setLoginEmail,
    setLoginPassword,
    setRecoveryClinicValue,
    setLoginError,
    setOpenDashboardAfterLogin,
    setTeamOperatorId,
    setTeamPin,
    handleLogin,
    selectLoginClinic,
    cancelClinicSelection,
    cancelPendingLogin,
    handleTeamIdentification,
    handleResetPassword,
    resetLoginState,
    cancelTeamIdentification,
  };
}

export type LoginFlowState = ReturnType<typeof useLoginFlow>;
