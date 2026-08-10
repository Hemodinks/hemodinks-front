import { useCallback, useRef, useState } from 'react';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
import { CBHPM_PAGE_SIZE } from '../../shared/utils/formatters';
import type { CbhpmGeral } from '../../types';
import type { CbhpmFilters } from '../../appTypes';
import {
  areCbhpmAutoSearchFiltersEqual,
  buildAppliedCbhpmFilters,
  CBHPM_AUTO_SEARCH_DELAY_MS,
  getCbhpmAutoSearchFilters,
} from './cbhpmLookupUtils';

const emptyCbhpmFilters: CbhpmFilters = {
  codigo: '',
  procedimento: '',
  porte: '',
};

export function useCbhpmLookup() {
  const [cbhpmModalOpen, setCbhpmModalOpen] = useState(false);
  const [cbhpmItems, setCbhpmItems] = useState<CbhpmGeral[]>([]);
  const [cbhpmFilters, setCbhpmFilters] = useState<CbhpmFilters>(emptyCbhpmFilters);
  const [appliedCbhpmFilters, setAppliedCbhpmFilters] = useState<CbhpmFilters>(emptyCbhpmFilters);
  const [cbhpmCurrentPage, setCbhpmCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('codigo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const resetCbhpmPage = useCallback(() => setCbhpmCurrentPage(1), []);
  const latestCbhpmFiltersRef = useRef(cbhpmFilters);
  latestCbhpmFiltersRef.current = cbhpmFilters;

  const commitDebouncedAutoSearch = useCallback(() => {
    resetCbhpmPage();
    setAppliedCbhpmFilters(buildAppliedCbhpmFilters(latestCbhpmFiltersRef.current));
  }, [resetCbhpmPage]);

  const [, setDebouncedCbhpmAutoFilters] = useDebouncedValue(getCbhpmAutoSearchFilters(cbhpmFilters), {
    delayMs: CBHPM_AUTO_SEARCH_DELAY_MS,
    isEqual: areCbhpmAutoSearchFiltersEqual,
    onCommit: commitDebouncedAutoSearch,
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
    setAppliedCbhpmFilters(emptyCbhpmFilters);
    setDebouncedCbhpmAutoFilters(getCbhpmAutoSearchFilters(emptyCbhpmFilters));
    setCbhpmCurrentPage(1);
    setCbhpmTotalItems(0);
    setCbhpmTotalPages(1);
    setCbhpmError('');
    setSortBy('codigo');
    setSortDirection('asc');
  };

  const applyCbhpmFiltersNow = useCallback(() => {
    resetCbhpmPage();
    setDebouncedCbhpmAutoFilters(getCbhpmAutoSearchFilters(cbhpmFilters));
    setAppliedCbhpmFilters(buildAppliedCbhpmFilters(cbhpmFilters));
  }, [cbhpmFilters, resetCbhpmPage, setDebouncedCbhpmAutoFilters]);

  return {
    cbhpmModalOpen,
    setCbhpmModalOpen,
    cbhpmItems,
    setCbhpmItems,
    cbhpmFilters,
    setCbhpmFilters,
    appliedCbhpmFilters,
    applyCbhpmFiltersNow,
    cbhpmCurrentPage,
    setCbhpmCurrentPage,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
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
