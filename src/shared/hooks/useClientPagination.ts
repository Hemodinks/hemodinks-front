import { useEffect, useMemo, useState } from 'react';

export function useClientPagination<T>(items: T[], pageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const visibleItems = useMemo(() => {
    const offset = (currentPage - 1) * pageSize;
    return items.slice(offset, offset + pageSize);
  }, [currentPage, items, pageSize]);

  return {
    visibleItems,
    currentPage,
    setCurrentPage,
    totalItems,
    totalPages,
    visibleStart: totalItems ? (currentPage - 1) * pageSize + 1 : 0,
    visibleEnd: Math.min(currentPage * pageSize, totalItems),
  };
}
