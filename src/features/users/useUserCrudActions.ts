import type { IsCurrentRoute } from '../../shared/hooks/useFormRouteSync';
import { type FormEvent, type MutableRefObject, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createUser, deleteUser, deleteUserArquivo, getUser, updateUser, uploadUserArquivo } from '../../services';
import { queryClient } from '../../queryClient';
import { queryKeys } from '../../shared/queryKeys';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import { DEFAULT_PROFILE_ID, formatProfileName, getErrorMessage, MEDICAL_PROFILE_ID, SUPER_ADMIN_PROFILE_ID, TEAM_PROFILE_ID } from '../../shared/utils/formatters';
import type { AuthSession, User, UserPayload } from '../../types';
import { toUserPayload, validateUserForm } from './userUtils';
import type { useUserForm } from './useUserForm';
import type { useUserList } from './useUserList';

type UseUserCrudActionsOptions = {
  session: AuthSession | null;
  canUseUserForm: boolean;
  canAccessUsers: boolean;
  isAdmin: boolean;
  userList: ReturnType<typeof useUserList>;
  userForm: ReturnType<typeof useUserForm>;
  userFormRequestRef: MutableRefObject<number>;
  navigateToUserForm: (recordId: number) => void;
  onRecordLoadError: (message: string) => void;
  navigateToView: (view: 'users' | 'profile' | 'dashboard', replace?: boolean) => void;
  persistSession: (session: AuthSession) => void;
  refreshUserList: (forceRefresh?: boolean) => Promise<void>;
  loadDashboardSummary: (token?: string, forceRefresh?: boolean) => Promise<void>;
  onDeleteCurrentUser: () => void;
  confirmAction: ConfirmAction;
};

export function useUserCrudActions(options: UseUserCrudActionsOptions) {
  const { session, canUseUserForm, canAccessUsers, isAdmin, userList, userForm, userFormRequestRef, navigateToUserForm, onRecordLoadError,
    navigateToView, persistSession, refreshUserList, loadDashboardSummary, onDeleteCurrentUser, confirmAction } = options;
  const submitInFlightRef = useRef(false);
  const saveMutation = useMutation({
    mutationFn: ({ id, payload, token }: { id: number | null; payload: UserPayload; token: string }) =>
      id ? updateUser(id, payload, token) : createUser(payload, token),
  });
  const deleteMutation = useMutation({ mutationFn: ({ id, token }: { id: number; token: string }) => deleteUser(id, token) });
  const deleteFileMutation = useMutation({
    mutationFn: ({ userId, arquivoId, token }: { userId: number; arquivoId: number; token: string }) => deleteUserArquivo(userId, arquivoId, token),
  });

  // Fills the form with `user` right away (when known) and then with the server details.
  // Called by the /usuarios/<id> route and by "meu cadastro" (/meu-cadastro is itself the form).
  const loadUserForEdit = async (userOrId: User | number, isCurrent: IsCurrentRoute = () => true) => {
    if (!session) return;
    const userId = typeof userOrId === 'number' ? userOrId : userOrId.id;
    const known = typeof userOrId === 'number' ? userList.users.find((user) => user.id === userId) : userOrId;
    const requestId = userFormRequestRef.current + 1;
    userFormRequestRef.current = requestId;
    userForm.resetUserForm();
    if (known) {
      userForm.applyUserToForm(known);
      userForm.setEditingUserDetails(known);
    }
    userForm.setFormError('');
    onRecordLoadError('');
    userList.setSuccessMessage('');
    userForm.setPendingUserFiles([]);
    try {
      userForm.setFormLoading(true);
      const details = await getUser(userId, session.token);
      if (userFormRequestRef.current !== requestId || !isCurrent()) return;
      userForm.setEditingUserDetails(details);
      userForm.applyUserToForm(details);
    } catch (error) {
      if (userFormRequestRef.current !== requestId || !isCurrent()) return;
      if (known) userForm.setFormError(getErrorMessage(error));
      else {
        // Never leave an empty form on an edit URL: it would read as "novo usuário".
        onRecordLoadError(getErrorMessage(error));
        navigateToView('users', true);
      }
    } finally {
      if (userFormRequestRef.current === requestId) userForm.setFormLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    if (!session) return;
    if (canAccessUsers) {
      navigateToUserForm(user.id);
      return;
    }
    navigateToView('profile');
    void loadUserForEdit(user);
  };

  const handleDeleteUserArquivo = async (user: User, arquivoId: number) => {
    if (!session) return;
    userForm.setFormError('');
    try {
      await deleteFileMutation.mutateAsync({ userId: user.id, arquivoId, token: session.token });
      const details = await getUser(user.id, session.token);
      userForm.setEditingUserDetails(details);
      userForm.applyUserToForm(details);
    } catch (error) { userForm.setFormError(getErrorMessage(error)); }
  };

  const handleSubmitUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session || submitInFlightRef.current) return;
    if (!canUseUserForm && !isAdmin) { userForm.setFormError('Sem permissao para editar este cadastro.'); return; }
    const validationError = validateUserForm(userForm.formData, userForm.editingUserDetails?.perfilId === TEAM_PROFILE_ID,
      session.user.perfilId === SUPER_ADMIN_PROFILE_ID);
    if (validationError) { userForm.setFormError(validationError); return; }

    submitInFlightRef.current = true;
    userForm.setFormLoading(true); userForm.setFormError(''); userList.setSuccessMessage('');
    try {
      const savedUser = await saveMutation.mutateAsync({ id: userForm.editingId, payload: toUserPayload(userForm.formData), token: session.token });
      userList.setSuccessMessage(userForm.editingId ? 'Usuário atualizado.' : 'Usuário cadastrado com senha temporária. Oriente a alteração no primeiro acesso.');
      if (savedUser.perfilId === MEDICAL_PROFILE_ID) {
        for (const file of userForm.pendingUserFiles) await uploadUserArquivo(savedUser.id, file, session.token);
      }
      if (userForm.editingId && savedUser.id === session.user.id) {
        persistSession({ ...session, user: { ...session.user, nome: savedUser.nome, email: savedUser.email,
          cpf: savedUser.cpf ?? null, crm: savedUser.crm ?? null, crmUf: savedUser.crmUf ?? null,
          fotoPerfil: savedUser.fotoPerfil ?? null, perfilId: savedUser.perfilId || DEFAULT_PROFILE_ID,
          perfilNome: formatProfileName(savedUser.perfilId || DEFAULT_PROFILE_ID, savedUser.perfilNome) } });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token), refetchType: 'none' }),
        queryClient.invalidateQueries({ queryKey: queryKeys.usersRoot(session.token), refetchType: 'none' }),
        queryClient.invalidateQueries({ queryKey: queryKeys.medicalUsers(session.token) }),
      ]);
      userForm.resetUserForm(); userList.setCurrentPage(1); if (isAdmin) navigateToView('users');
      await refreshUserList(true);
      if (!isAdmin) navigateToView('dashboard');
      await loadDashboardSummary(session.token, true);
    } catch (error) { userForm.setFormError(getErrorMessage(error)); }
    finally { submitInFlightRef.current = false; userForm.setFormLoading(false); }
  };

  const deleteSelectedUser = async (user: User) => {
    if (!session) return;
    userList.setUsersError(''); userList.setSuccessMessage('');
    try {
      await deleteMutation.mutateAsync({ id: user.id, token: session.token });
      if (user.id === session.user.id) { onDeleteCurrentUser(); return; }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token), refetchType: 'none' }),
        queryClient.invalidateQueries({ queryKey: queryKeys.usersRoot(session.token), refetchType: 'none' }),
        queryClient.invalidateQueries({ queryKey: queryKeys.medicalUsers(session.token) }),
      ]);
      userList.setSuccessMessage('Usuário excluído.');
      await refreshUserList(true); await loadDashboardSummary(session.token, true);
    } catch (error) { userList.setUsersError(getErrorMessage(error)); }
  };
  const handleDeleteUser = (user: User) => confirmAction({ tone: 'delete', title: 'Excluir usuário?',
    message: `Deseja excluir "${user.nome}"? Esta ação não poderá ser desfeita.`, confirmLabel: 'Sim', cancelLabel: 'Não',
    onConfirm: () => deleteSelectedUser(user) });

  return { handleEditUser, loadUserForEdit, handleDeleteUserArquivo, handleSubmitUser, handleDeleteUser };
}
