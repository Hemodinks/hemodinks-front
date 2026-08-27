import { type FormEvent, type MutableRefObject, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createUser, deleteUser, deleteUserArquivo, getUser, updateUser, uploadUserArquivo } from '../../services';
import { queryClient } from '../../queryClient';
import { queryKeys } from '../../shared/queryKeys';
import type { ConfirmAction } from '../../shared/components/ConfirmationDialog';
import { DEFAULT_PROFILE_ID, formatProfileName, getErrorMessage, MEDICAL_PROFILE_ID, SUPER_ADMIN_PROFILE_ID, TEAM_PROFILE_ID } from '../../shared/utils/formatters';
import { sortUsersForListing } from '../../shared/utils/listing';
import type { AuthSession, User, UserPayload } from '../../types';
import type { ModuleMode } from '../../appTypes';
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
  setModuleMode: React.Dispatch<React.SetStateAction<ModuleMode>>;
  navigateToView: (view: 'users' | 'profile' | 'dashboard') => void;
  persistSession: (session: AuthSession) => void;
  refreshUserList: (forceRefresh?: boolean) => Promise<void>;
  loadDashboardSummary: (token?: string, forceRefresh?: boolean) => Promise<void>;
  onDeleteCurrentUser: () => void;
  confirmAction: ConfirmAction;
};

export function useUserCrudActions(options: UseUserCrudActionsOptions) {
  const { session, canUseUserForm, canAccessUsers, isAdmin, userList, userForm, userFormRequestRef, setModuleMode,
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
      if (userFormRequestRef.current === requestId) userForm.setFormError(getErrorMessage(error));
    } finally {
      if (userFormRequestRef.current === requestId) userForm.setFormLoading(false);
    }
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
      userList.setUsers((current) => sortUsersForListing(userForm.editingId
        ? current.map((item) => item.id === savedUser.id ? savedUser : item)
        : [savedUser, ...current]));
      if (userForm.editingId && savedUser.id === session.user.id) {
        persistSession({ ...session, user: { ...session.user, nome: savedUser.nome, email: savedUser.email,
          cpf: savedUser.cpf ?? null, crm: savedUser.crm ?? null, crmUf: savedUser.crmUf ?? null,
          fotoPerfil: savedUser.fotoPerfil ?? null, perfilId: savedUser.perfilId || DEFAULT_PROFILE_ID,
          perfilNome: formatProfileName(savedUser.perfilId || DEFAULT_PROFILE_ID, savedUser.perfilNome) } });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.usersRoot(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.medicalUsers(session.token) }),
      ]);
      userForm.resetUserForm(); userList.setCurrentPage(1); setModuleMode('list');
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
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.usersRoot(session.token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.medicalUsers(session.token) }),
      ]);
      userList.setSuccessMessage('Usuário excluído.');
      await refreshUserList(true); await loadDashboardSummary(session.token, true);
    } catch (error) { userList.setUsersError(getErrorMessage(error)); }
  };
  const handleDeleteUser = (user: User) => confirmAction({ tone: 'delete', title: 'Excluir usuário?',
    message: `Deseja excluir "${user.nome}"? Esta ação não poderá ser desfeita.`, confirmLabel: 'Sim', cancelLabel: 'Não',
    onConfirm: () => deleteSelectedUser(user) });

  return { handleEditUser, handleDeleteUserArquivo, handleSubmitUser, handleDeleteUser };
}
