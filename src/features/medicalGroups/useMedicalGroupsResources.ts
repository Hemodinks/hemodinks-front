import { type Dispatch, type SetStateAction, useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AppView, ModuleMode } from '../../appTypes';
import {
  createMedicalGroup,
  deleteMedicalGroup,
  getMedicalGroup,
  getMedicalGroups,
  getScopedMedicalUsers,
  updateMedicalGroup,
} from '../../services';
import { queryClient } from '../../queryClient';
import { useAsyncOperation } from '../../shared/hooks/useAsyncOperation';
import { queryKeys } from '../../shared/queryKeys';
import { getErrorMessage, PAGE_SIZE } from '../../shared/utils/formatters';
import {
  getPagedItems,
  getPagedTotal,
  getPagedTotalPages,
  sortUsersByName,
} from '../../shared/utils/listing';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import type { MedicalUserOption } from '../../shared/domain/clinicalContracts';
import type { MedicalGroup, MedicalGroupFormData } from './medicalGroupTypes';

const LIST_CACHE_TIME_MS = 20 * 1000;
const LOOKUP_CACHE_TIME_MS = 30 * 60 * 1000;
const GROUPS_COUNT_QUERY = {
  page: 1,
  pageSize: 1,
  search: '',
  sortBy: 'recent',
  sortDirection: 'desc' as const,
};

type UseMedicalGroupsResourcesOptions = {
  session: AuthSession | null;
  activeView: AppView;
  moduleMode: ModuleMode;
  canAccessMedicalGroups: boolean;
  currentPage: number;
  searchTerm: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  totalItems: number;
  setGroups: Dispatch<SetStateAction<MedicalGroup[]>>;
  setGroupsError: Dispatch<SetStateAction<string>>;
  setTotalItems: Dispatch<SetStateAction<number>>;
  setTotalPages: Dispatch<SetStateAction<number>>;
  setAvailableMedicalUsers: Dispatch<SetStateAction<MedicalUserOption[]>>;
};

export function useMedicalGroupsResources({
  session,
  activeView,
  moduleMode,
  canAccessMedicalGroups,
  currentPage,
  searchTerm,
  sortBy,
  sortDirection,
  totalItems,
  setGroups,
  setGroupsError,
  setTotalItems,
  setTotalPages,
  setAvailableMedicalUsers,
}: UseMedicalGroupsResourcesOptions) {
  const sessionReady = Boolean(
    session && !session.user.precisaTrocarSenha && canAccessMedicalGroups,
  );
  const groupsQueryParams = useMemo(
    () => ({
      page: currentPage,
      pageSize: PAGE_SIZE,
      search: searchTerm,
      sortBy,
      sortDirection,
    }),
    [currentPage, searchTerm, sortBy, sortDirection],
  );
  const groupsQuery = useQuery({
    queryKey: queryKeys.medicalGroups(session?.token ?? '', groupsQueryParams),
    queryFn: () => getMedicalGroups(session?.token ?? '', groupsQueryParams),
    enabled: sessionReady && activeView === 'medicalGroups' && moduleMode === 'list',
    staleTime: LIST_CACHE_TIME_MS,
  });
  const groupsCountQuery = useQuery({
    queryKey: queryKeys.medicalGroups(session?.token ?? '', GROUPS_COUNT_QUERY),
    queryFn: () => getMedicalGroups(session?.token ?? '', GROUPS_COUNT_QUERY),
    enabled: sessionReady,
    staleTime: LIST_CACHE_TIME_MS,
  });
  const availableMedicalUsersQuery = useQuery({
    queryKey: queryKeys.medicalUsers(session?.token ?? ''),
    queryFn: () => getScopedMedicalUsers(session?.token ?? ''),
    enabled: sessionReady,
    staleTime: LOOKUP_CACHE_TIME_MS,
  });
  const saveMutation = useMutation({
    mutationFn: ({
      id,
      payload,
      token,
    }: {
      id: number | null;
      payload: MedicalGroupFormData;
      token: string;
    }) => (id ? updateMedicalGroup(id, payload, token) : createMedicalGroup(payload, token)),
  });
  const deleteMutation = useMutation({
    mutationFn: ({ id, token }: { id: number; token: string }) => deleteMedicalGroup(id, token),
  });
  const editOperation = useAsyncOperation((_signal, id: number, token: string) =>
    getMedicalGroup(id, token),
  );

  useEffect(() => {
    if (!groupsQuery.data) return;
    setGroups(getPagedItems(groupsQuery.data));
    setTotalItems(getPagedTotal(groupsQuery.data));
    setTotalPages(getPagedTotalPages(groupsQuery.data));
    setGroupsError('');
  }, [groupsQuery.data]);

  useEffect(() => {
    if (groupsQuery.error) setGroupsError(getErrorMessage(groupsQuery.error));
  }, [groupsQuery.error]);

  useEffect(() => {
    if (availableMedicalUsersQuery.data) {
      setAvailableMedicalUsers(sortUsersByName(availableMedicalUsersQuery.data));
    }
  }, [availableMedicalUsersQuery.data]);

  useEffect(() => {
    if (availableMedicalUsersQuery.error) {
      setGroupsError(getErrorMessage(availableMedicalUsersQuery.error));
    }
  }, [availableMedicalUsersQuery.error]);

  const loadMedicalGroups = async (token = session?.token, forceRefresh = false) => {
    if (!token) return;
    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.medicalGroupsRoot(token) });
    }
    await groupsQuery.refetch();
  };

  const loadAvailableMedicalUsers = async (token = session?.token, forceRefresh = false) => {
    if (!token) return;
    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.medicalUsers(token) });
    }
    await availableMedicalUsersQuery.refetch();
  };

  return {
    groupsLoading: groupsQuery.isFetching,
    formLoading: editOperation.isLoading || saveMutation.isPending,
    medicalGroupsCount: groupsCountQuery.data ? getPagedTotal(groupsCountQuery.data) : totalItems,
    saveMutation,
    deleteMutation,
    editOperation,
    loadMedicalGroups,
    loadAvailableMedicalUsers,
  };
}
