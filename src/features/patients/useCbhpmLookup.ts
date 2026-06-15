import { useCallback, useState } from 'react';
import type { CbhpmFilters } from '../../appTypes';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { CBHPM_PAGE_SIZE } from '../../shared/utils/formatters';
import type { CbhpmGeral } from '../../types';

const emptyCbhpmFilters: CbhpmFilters = {
  codigo: '',
  procedimento: '',
  porte: '',
};

function areCbhpmFiltersEqual(current: CbhpmFilters, debounced: CbhpmFilters) {
  return current.codigo === debounced.codigo
    && current.procedimento === debounced.procedimento
    && current.porte === debounced.porte;
}

export function useCbhpmLookup() {
  const [cbhpmModalOpen, setCbhpmModalOpen] = useState(false);
  const [cbhpmItems, setCbhpmItems] = useState<CbhpmGeral[]>([]);
  const [cbhpmFilters, setCbhpmFilters] = useState<CbhpmFilters>(emptyCbhpmFilters);
  const [cbhpmCurrentPage, setCbhpmCurrentPage] = useState(1);
  const resetCbhpmPage = useCallback(() => setCbhpmCurrentPage(1), []);
  const [debouncedCbhpmFilters] = useDebouncedValue(cbhpmFilters, {
    delayMs: 800,
    isEqual: areCbhpmFiltersEqual,
    onCommit: resetCbhpmPage,
  });
  const [cbhpmTotalItems, setCbhpmTotalItems] = useState(0);
  const [cbhpmTotalPages, setCbhpmTotalPages] = useState(1);
  const [cbhpmLoading, setCbhpmLoading] = useState(false);
  const [cbhpmError, setCbhpmError] = useState('');

  const cbhpmTotalPageCount = Math.max(1, cbhpmTotalPages);
  const cbhpmPageStart = (cbhpmCurrentPage - 1) * CBHPM_PAGE_SIZE;
  const cbhpmPageEnd = cbhpmPageStart + CBHPM_PAGE_SIZE;
  const cbhpmVisibleStart = cbhpmTotalItems ? cbhpmPageStart + 1 : 0;
  const cbhpmVisibleEnd = Math.min(cbhpmPageEnd, cbhpmTotalItems);

  const resetCbhpmLookup = () => {
    setCbhpmModalOpen(false);
    setCbhpmItems([]);
    setCbhpmFilters(emptyCbhpmFilters);
    setCbhpmCurrentPage(1);
    setCbhpmTotalItems(0);
    setCbhpmTotalPages(1);
    setCbhpmError('');
  };

  return {
    cbhpmModalOpen,
    setCbhpmModalOpen,
    cbhpmItems,
    setCbhpmItems,
    cbhpmFilters,
    setCbhpmFilters,
    debouncedCbhpmFilters,
    cbhpmCurrentPage,
    setCbhpmCurrentPage,
    cbhpmTotalItems,
    setCbhpmTotalItems,
    cbhpmTotalPageCount,
    setCbhpmTotalPages,
    cbhpmLoading,
    setCbhpmLoading,
    cbhpmError,
    setCbhpmError,
    cbhpmVisibleStart,
    cbhpmVisibleEnd,
    resetCbhpmLookup,
  };
}
