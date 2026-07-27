import { type FormEvent, useEffect, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { authenticate, listPublicClinics, resetPassword } from "../../services";
import { queryClient } from "../../queryClient";
import {
  API_ASSET_BASE_URL,
  DEFAULT_PASSWORD,
  getErrorMessage,
  isValidEmail,
} from "../../shared/utils/formatters";
import type { AuthSession, PublicClinic } from "../../types";
import {
  buildSessionFromLogin,
  getResetPasswordCompletedMessage,
  shouldOpenDashboardAfterLogin,
} from "../../app/appSession";

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
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginClinicValue, setLoginClinicValue] = useState("");
  const [publicClinics, setPublicClinics] = useState<PublicClinic[]>([]);
  const [publicClinicsLoading, setPublicClinicsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginInfo, setLoginInfo] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [openDashboardAfterLogin, setOpenDashboardAfterLogin] = useState(false);
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
        setPublicClinics(clinics);
        if (clinics.length === 1) setLoginClinicValue(String(clinics[0].id));
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

  const returnToLogin = (infoMessage = "") => {
    setLoginError("");
    setLoginInfo(infoMessage);
    setLoginPassword("");
    navigate("/", { replace: true });
  };

  const handleResetPasswordCompleted = (message: string) => {
    returnToLogin(getResetPasswordCompletedMessage(message));
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    setLoginInfo("");

    if (!isValidEmail(loginEmail)) {
      setLoginError("Informe um email valido.");
      return;
    }
    if (!selectedLoginClinic) {
      setLoginError("Selecione uma clinica cadastrada.");
      return;
    }

    setLoginLoading(true);
    try {
      const result = await authenticate(
        loginEmail.trim(),
        loginPassword,
        selectedLoginClinic.slug,
      );
      const nextSession = buildSessionFromLogin(result, loginPassword);
      queryClient.clear();
      setOpenDashboardAfterLogin(
        shouldOpenDashboardAfterLogin(nextSession.user.perfilId),
      );
      persistSession(nextSession);
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoginError("");
    setLoginInfo("");

    if (!isValidEmail(loginEmail)) {
      setLoginError("Informe um email valido para resetar a senha.");
      return;
    }

    setResetPasswordLoading(true);
    try {
      if (!selectedLoginClinic) {
        setLoginError("Selecione a clinica para redefinir a senha.");
        return;
      }
      const result = await resetPassword(
        loginEmail.trim(),
        selectedLoginClinic.slug,
      );

      if (result.mode === "default-password") {
        setLoginPassword(DEFAULT_PASSWORD);
        setLoginInfo(
          `Senha redefinida para ${DEFAULT_PASSWORD}. Use-a para entrar e altere a seguir.`,
        );
        return;
      }

      setLoginPassword("");
      setLoginInfo(
        result.message ||
          "Se o email estiver cadastrado, enviaremos as instrucoes para redefinir a senha.",
      );
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setResetPasswordLoading(false);
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
    publicClinicsLoading,
    loginError,
    setLoginError,
    loginInfo,
    setLoginInfo,
    loginLoading,
    resetPasswordLoading,
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
