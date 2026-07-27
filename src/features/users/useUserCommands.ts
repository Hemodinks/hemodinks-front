import { type FormEvent, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  createUser,
  deleteUser,
  getUser,
  updateUser,
  uploadUserArquivo,
} from '../../services';
import type { AppView, ModuleMode } from '../../appTypes';
import { queryClient } from '../../queryClient';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import { queryKeys } from '../../shared/queryKeys';
import {
  DEFAULT_PASSWORD,
  DEFAULT_PROFILE_ID,
  formatProfileName,
  getErrorMessage,
  MEDICAL_PROFILE_ID,
  SUPER_ADMIN_PROFILE_ID,
} from '../../shared/utils/formatters';
import { sortUsersForListing } from '../../shared/utils/listing';
import type { AuthSession, User, UserPayload } from '../../types';
import { toUserPayload, validateUserForm } from './userUtils';
import type { useUserForm } from './useUserForm';
import type { useUserList } from './useUserList';

type UserCommandsOptions = {
  session: AuthSession | null;
  canAccessUsers: boolean;
  canUseUserForm: boolean;
  isAdmin: boolean;
  userForm: ReturnType<typeof useUserForm>;
  userList: ReturnType<typeof useUserList>;
  setModuleMode: (mode: ModuleMode) => void;
  navigateToView: (view: AppView, replace?: boolean) => void;
  persistSession: (nextSession: AuthSession) => void;
  refreshUserList: (forceRefresh?: boolean) => Promise<void>;
  loadDashboardSummary: (token?: string, forceRefresh?: boolean) => Promise<void>;
  onDeleteCurrentUser: () => void;
  confirmAction: ConfirmAction;
};

export function useUserCommands({
  session,
  canAccessUsers,
  canUseUserForm,
  isAdmin,
  userForm,
  userList,
  setModuleMode,
  navigateToView,
  persistSession,
  refreshUserList,
  loadDashboardSummary,
  onDeleteCurrentUser,
  confirmAction,
}: UserCommandsOptions) {
  const userFormRequestRef = useRef(0);
  const saveUserMutation = useMutation({
    mutationFn: ({ id, payload, token }: { id: number | null; payload: UserPayload; token: string }) => (
      id ? updateUser(id, payload, token) : createUser(payload, token)
    ),
  });
  const deleteUserMutation = useMutation({
    mutationFn: ({ id, token }: { id: number; token: string }) => deleteUser(id, token),
  });

  const cancelUserFormRequest = () => {
    userFormRequestRef.current += 1;
    userForm.setFormLoading(false);
  };

  const handleEditUser = async (user: User) => {
    if (!session) return;

    const requestId = userFormRequestRef.current + 1;
    userFormRequestRef.current = requestId;
    userForm.applyUserToForm(user);
    userForm.setEditingUserDetails(user);
    userForm.setFormError('');
    userList.setSuccessMessage('');
    userForm.setPendingUserFiles([]);
    navigateToView(canAccessUsers ? 'users' : 'profile');
    setModuleMode('form');

    try {
      userForm.setFormLoading(true);
      const details = await getUser(user.id, session.token);
      if (userFormRequestRef.current !== requestId) return;
      userForm.setEditingUserDetails(details);
      userForm.applyUserToForm(details);
    } catch (error) {
      if (userFormRequestRef.current !== requestId) return;
      userForm.setFormError(getErrorMessage(error));
    } finally {
      if (userFormRequestRef.current === requestId) userForm.setFormLoading(false);
    }
  };

  const saveUser = async (payload: UserPayload, ownProfileChanged: boolean) => {
    if (!session) return;

    userForm.setFormLoading(true);
    userForm.setFormError('');
    userList.setSuccessMessage('');
    try {
      const savedUser = await saveUserMutation.mutateAsync({
        id: userForm.editingId,
        payload,
        token: session.token,
      });
      userList.setSuccessMessage(
        userForm.editingId
          ? 'Usuário atualizado.'
          : `Usuário cadastrado com senha inicial ${DEFAULT_PASSWORD}.`,
      );

      if (savedUser.perfilId === MEDICAL_PROFILE_ID) {
        for (const file of userForm.pendingUserFiles) {
          await uploadUserArquivo(savedUser.id, file, session.token);
        }
      }

      userList.setUsers((current) => sortUsersForListing(
        userForm.editingId
          ? current.map((user) => (user.id === savedUser.id ? savedUser : user))
          : [savedUser, ...current],
      ));

      if (userForm.editingId && savedUser.id === session.user.id) {
        if (ownProfileChanged) {
          onDeleteCurrentUser();
          return;
        }
        persistSession({
          ...session,
          user: {
            ...session.user,
            nome: savedUser.nome,
            email: savedUser.email,
            cpf: savedUser.cpf ?? null,
            crm: savedUser.crm ?? null,
            crmUf: savedUser.crmUf ?? null,
            fotoPerfil: savedUser.fotoPerfil ?? null,
            perfilId: savedUser.perfilId || DEFAULT_PROFILE_ID,
            perfilNome: formatProfileName(savedUser.perfilId || DEFAULT_PROFILE_ID, savedUser.perfilNome),
          },
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.usersRoot(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.medicalUsers(session.token) }),
      ]);
      userForm.resetUserForm();
      userList.setCurrentPage(1);
      setModuleMode('list');
      await refreshUserList(true);
      if (!isAdmin) navigateToView('dashboard');
      await loadDashboardSummary(session.token, true);
    } catch (error) {
      userForm.setFormError(getErrorMessage(error));
    } finally {
      userForm.setFormLoading(false);
    }
  };

  const handleSubmitUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    if (!canUseUserForm && !isAdmin) {
      userForm.setFormError('Sem permissao para editar este cadastro.');
      return;
    }

    const isSuperAdmin = session.user.perfilId === SUPER_ADMIN_PROFILE_ID;
    const validationError = validateUserForm(userForm.formData, isSuperAdmin);
    if (validationError) {
      userForm.setFormError(validationError);
      return;
    }

    const payload = toUserPayload(userForm.formData);
    const ownProfileChanged = Boolean(
      userForm.editingId === session.user.id
      && userForm.formData.perfilId !== session.user.perfilId,
    );
    if (isSuperAdmin && ownProfileChanged) {
      confirmAction({
        tone: 'update',
        title: 'Alterar seu próprio perfil?',
        message: 'Você poderá perder o acesso à administração da plataforma e depender de outro Super Administrador para recuperar essas permissões. Após salvar, sua sessão será encerrada para aplicar o novo perfil com segurança.',
        confirmLabel: 'Alterar meu perfil',
        cancelLabel: 'Manter perfil atual',
        onConfirm: () => saveUser(payload, true),
      });
      return;
    }
    void saveUser(payload, false);
  };

  const deleteSelectedUser = async (user: User) => {
    if (!session) return;
    userList.setUsersError('');
    userList.setSuccessMessage('');
    try {
      await deleteUserMutation.mutateAsync({ id: user.id, token: session.token });
      if (user.id === session.user.id) {
        onDeleteCurrentUser();
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.usersRoot(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.medicalUsers(session.token) }),
      ]);
      userList.setSuccessMessage('Usuário excluído.');
      await refreshUserList(true);
      await loadDashboardSummary(session.token, true);
    } catch (error) {
      userList.setUsersError(getErrorMessage(error));
    }
  };

  const handleDeleteUser = (user: User) => {
    confirmAction({
      tone: 'delete',
      title: 'Excluir usuário?',
      message: `Deseja excluir "${user.nome}"? Esta ação não poderá ser desfeita.`,
      confirmLabel: 'Sim',
      cancelLabel: 'Não',
      onConfirm: () => deleteSelectedUser(user),
    });
  };

  return {
    cancelUserFormRequest,
    handleEditUser,
    handleSubmitUser,
    handleDeleteUser,
  };
}
