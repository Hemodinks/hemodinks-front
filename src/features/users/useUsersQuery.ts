import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AppView, ModuleMode } from '../../appTypes';
import { queryClient } from '../../queryClient';
import { getUsers } from '../../services';
import { queryKeys } from '../../shared/queryKeys';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import { getErrorMessage, PAGE_SIZE } from '../../shared/utils/formatters';
import {
  getPagedItems,
  getPagedTotal,
  getPagedTotalPages,
  sortUsersForListing,
} from '../../shared/utils/listing';
import type { useUserList } from './useUserList';

const LIST_CACHE_TIME_MS = 20 * 1000;

type UsersQueryOptions = {
  session: AuthSession | null;
  activeView: AppView;
  moduleMode: ModuleMode;
  canAccessUsers: boolean;
  userList: ReturnType<typeof useUserList>;
};

export function useUsersQuery({
  session,
  activeView,
  moduleMode,
  canAccessUsers,
  userList,
}: UsersQueryOptions) {
  const params = useMemo(
    () => ({
      page: userList.currentPage,
      pageSize: PAGE_SIZE,
      search: userList.debouncedSearchTerm,
      sortBy: userList.sortBy,
      sortDirection: userList.sortDirection,
    }),
    [userList.currentPage, userList.debouncedSearchTerm, userList.sortBy, userList.sortDirection],
  );
  const enabled = Boolean(
    session &&
    !session.user.precisaTrocarSenha &&
    canAccessUsers &&
    activeView === 'users' &&
    moduleMode === 'list',
  );
  const query = useQuery({
    queryKey: queryKeys.users(session?.token ?? '', params),
    queryFn: () => getUsers(session?.token ?? '', params),
    enabled,
    staleTime: LIST_CACHE_TIME_MS,
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }
    userList.setUsers(sortUsersForListing(getPagedItems(query.data)));
    userList.setUsersTotalItems(getPagedTotal(query.data));
    userList.setUsersTotalPages(getPagedTotalPages(query.data));
    userList.setUsersError('');
  }, [
    query.data,
    userList.setUsers,
    userList.setUsersError,
    userList.setUsersTotalItems,
    userList.setUsersTotalPages,
  ]);

  useEffect(() => {
    if (query.error) {
      userList.setUsersError(getErrorMessage(query.error));
    }
  }, [query.error, userList.setUsersError]);

  return {
    isLoading: query.isFetching,
    refresh: async (forceRefresh = false) => {
      if (!session) return;
      if (forceRefresh) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.usersRoot(session.token),
        });
      }
      await query.refetch();
    },
  };
}
