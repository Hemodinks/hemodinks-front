import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { PacienteFilters } from '../../appTypes';
import { emptyPacienteFilters } from './patientUtils';

type Options = {
  isAdmin: boolean;
  currentPage: number;
  totalPages: number;
  cbhpmCurrentPage: number;
  cbhpmTotalPages: number;
  setFilters: Dispatch<SetStateAction<PacienteFilters>>;
  setDebouncedFilters: Dispatch<SetStateAction<PacienteFilters>>;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setCbhpmCurrentPage: Dispatch<SetStateAction<number>>;
};

export function usePatientPaginationGuards({
  isAdmin,
  currentPage,
  totalPages,
  cbhpmCurrentPage,
  cbhpmTotalPages,
  setFilters,
  setDebouncedFilters,
  setCurrentPage,
  setCbhpmCurrentPage,
}: Options) {
  useEffect(() => {
    if (isAdmin) return;
    setFilters(emptyPacienteFilters);
    setDebouncedFilters(emptyPacienteFilters);
  }, [isAdmin, setDebouncedFilters, setFilters]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, setCurrentPage, totalPages]);

  useEffect(() => {
    if (cbhpmCurrentPage > cbhpmTotalPages) setCbhpmCurrentPage(cbhpmTotalPages);
  }, [cbhpmCurrentPage, cbhpmTotalPages, setCbhpmCurrentPage]);
}
