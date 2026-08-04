import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react';
import type { AppView, ModuleMode } from '../../appTypes';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import { formatProfileName } from '../../shared/utils/formatters';
import type { useUserCommands } from './useUserCommands';

type UseUsersNavigationOptions = {
  session: AuthSession | null;
  activeView: AppView;
  moduleMode: ModuleMode;
  canAccessUsers: boolean;
  canEditOwnUser: boolean;
  editingId: number | null;
  currentPage: number;
  totalPages: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setModuleMode: Dispatch<SetStateAction<ModuleMode>>;
  navigateToView: (view: AppView, replace?: boolean) => void;
  persistSession: (nextSession: AuthSession) => void;
  setSuccessMessage: Dispatch<SetStateAction<string>>;
  setShowPasswordModal: Dispatch<SetStateAction<boolean>>;
  resetUserForm: () => void;
  userCommands: ReturnType<typeof useUserCommands>;
  refreshUserList: (forceRefresh?: boolean) => Promise<void>;
};

export function useUsersNavigation({
  session,
  activeView,
  moduleMode,
  canAccessUsers,
  canEditOwnUser,
  editingId,
  currentPage,
  totalPages,
  setCurrentPage,
  setModuleMode,
  navigateToView,
  persistSession,
  setSuccessMessage,
  setShowPasswordModal,
  resetUserForm,
  userCommands,
  refreshUserList,
}: UseUsersNavigationOptions) {
  const skipProfileAutoOpenRef = useRef(false);

  const resetUserFormState = (options?: { suppressProfileAutoOpen?: boolean }) => {
    if (options?.suppressProfileAutoOpen) {
      skipProfileAutoOpenRef.current = true;
    }

    userCommands.cancelUserFormRequest();
    resetUserForm();
    setModuleMode('list');
  };

  const handlePasswordChanged = (message: string) => {
    if (!session) {
      return;
    }

    persistSession({
      ...session,
      user: {
        ...session.user,
        precisaTrocarSenha: false,
      },
    });
    setShowPasswordModal(false);
    setSuccessMessage(message);
  };

  const openUsersList = () => {
    resetUserFormState({ suppressProfileAutoOpen: true });

    if (!canAccessUsers) {
      navigateToView('dashboard');
      return;
    }

    navigateToView('users');
  };

  const openNewUserForm = () => {
    if (!canAccessUsers) {
      return;
    }

    resetUserForm();
    setSuccessMessage('');
    navigateToView('users');
    setModuleMode('form');
  };

  const closeUserForm = () => {
    userCommands.cancelUserFormRequest();
    resetUserForm();
    setModuleMode('list');

    if (!canAccessUsers) {
      skipProfileAutoOpenRef.current = true;
      navigateToView('dashboard');
    }
  };

  const openMyProfile = () => {
    if (!session || !canEditOwnUser) {
      return;
    }

    skipProfileAutoOpenRef.current = false;
    void userCommands.handleEditUser({
      id: session.user.id,
      nome: session.user.nome,
      email: session.user.email,
      telefone: '',
      cpf: session.user.cpf ?? null,
      crm: session.user.crm ?? null,
      crmUf: session.user.crmUf ?? null,
      fotoPerfil: session.user.fotoPerfil ?? null,
      dataCadastro: '',
      dataNascimento: '',
      ativo: true,
      precisaTrocarSenha: session.user.precisaTrocarSenha,
      perfilId: session.user.perfilId,
      perfilNome: formatProfileName(session.user.perfilId, session.user.perfilNome),
      arquivosCount: 0,
      arquivos: [],
    });
  };

  useEffect(() => {
    if (activeView !== 'profile') {
      skipProfileAutoOpenRef.current = false;
      return;
    }

    if (
      canEditOwnUser &&
      session &&
      !skipProfileAutoOpenRef.current &&
      (moduleMode !== 'form' || editingId !== session.user.id)
    ) {
      openMyProfile();
    }
  }, [activeView, canEditOwnUser, editingId, moduleMode, session?.user.id]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return {
    handlePasswordChanged,
    openUsersList,
    openNewUserForm,
    closeUserForm,
    resetUserFormState,
    openMyProfile,
    refreshUsers: () => void refreshUserList(true),
  };
}
