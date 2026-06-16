import { useCallback, useState } from 'react';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { PAGE_SIZE } from '../../shared/utils/formatters';
import type { User } from '../../types';

export function useUserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('recent');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const resetUsersPage = useCallback(() => setCurrentPage(1), []);
  const [debouncedSearchTerm] = useDebouncedValue(searchTerm, { onCommit: resetUsersPage });
  const [usersTotalItems, setUsersTotalItems] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);

  const totalPages = Math.max(1, usersTotalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const paginatedUsers = users;
  const visibleStart = usersTotalItems ? pageStart + 1 : 0;
  const visibleEnd = Math.min(pageEnd, usersTotalItems);

  const resetUserListState = () => {
    setUsers([]);
    setUsersError('');
    setUsersTotalItems(0);
    setUsersTotalPages(1);
    setSuccessMessage('');
    setSearchTerm('');
    setCurrentPage(1);
    setSortBy('recent');
    setSortDirection('desc');
  };

  return {
    users,
    setUsers,
    usersLoading,
    setUsersLoading,
    usersError,
    setUsersError,
    successMessage,
    setSuccessMessage,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    debouncedSearchTerm,
    usersTotalItems,
    setUsersTotalItems,
    usersTotalPages,
    setUsersTotalPages,
    totalPages,
    paginatedUsers,
    visibleStart,
    visibleEnd,
    resetUserListState,
  };
}
