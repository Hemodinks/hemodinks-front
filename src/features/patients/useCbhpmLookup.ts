import { useCallback, useRef, useState } from 'react';
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue';
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

  const [, setDebouncedCbhpmAutoFilters] = useDebouncedValue(
    getCbhpmAutoSearchFilters(cbhpmFilters),
    {
      delayMs: CBHPM_AUTO_SEARCH_DELAY_MS,
      isEqual: areCbhpmAutoSearchFiltersEqual,
      onCommit: commitDebouncedAutoSearch,
    },
  );
  const resetCbhpmLookup = () => {
    setCbhpmModalOpen(false);
    setCbhpmFilters(emptyCbhpmFilters);
    setAppliedCbhpmFilters(emptyCbhpmFilters);
    setDebouncedCbhpmAutoFilters(getCbhpmAutoSearchFilters(emptyCbhpmFilters));
    setCbhpmCurrentPage(1);
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
    resetCbhpmLookup,
  };
}
