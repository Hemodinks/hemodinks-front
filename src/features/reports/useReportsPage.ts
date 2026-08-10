import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AuthSession } from '../../types';
import { createEmptyBillingFilters, filterBillingRecords, summarizeBillingRecords } from '../billing/billingUtils';
import { loadReportData } from './reportData';
import {
  emptyReportFilters,
  enrichReportRecords,
  filterReportRecords,
  getReportOptions,
  validateReportDateRange,
} from './reportFilters';
import type { ReportFilters } from './reportTypes';
import { useReportExport } from './useReportExport';

const REPORT_PAGE_SIZE = 10;

type Options = {
  session: AuthSession;
  companyName: string;
  isMedical: boolean;
};

export function useReportsPage({ session, companyName, isMedical }: Options) {
  const [filters, setFilters] = useState<ReportFilters>(emptyReportFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(emptyReportFilters);
  const [filterError, setFilterError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const query = useQuery({
    queryKey: ['reports', session.token],
    queryFn: () => loadReportData(session.token),
    staleTime: 30 * 1000,
  });

  const scopedRecords = useMemo(() => {
    const data = query.data;
    if (!data) return [];
    const billingScope = filterBillingRecords(
      data.records,
      createEmptyBillingFilters('', ''),
      {
        restrictToMedicalUser: isMedical,
        currentMedicalUserId: session.user.id,
        currentMedicalUserName: session.user.nome,
      },
    );
    return enrichReportRecords(billingScope, data.medicalGroups, data.teams);
  }, [isMedical, query.data, session.user.id, session.user.nome]);

  const records = useMemo(
    () => filterReportRecords(scopedRecords, appliedFilters),
    [appliedFilters, scopedRecords],
  );
  const options = useMemo(
    () => getReportOptions(scopedRecords, query.data?.medicalGroups ?? [], query.data?.teams ?? []),
    [query.data?.medicalGroups, query.data?.teams, scopedRecords],
  );
  const summary = useMemo(() => summarizeBillingRecords(records), [records]);
  const totalPages = Math.max(1, Math.ceil(records.length / REPORT_PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);
  const visibleStart = records.length ? (visiblePage - 1) * REPORT_PAGE_SIZE + 1 : 0;
  const visibleEnd = Math.min(visiblePage * REPORT_PAGE_SIZE, records.length);
  const visibleRecords = records.slice(visibleStart ? visibleStart - 1 : 0, visibleEnd);
  const reportExport = useReportExport(records, companyName, session.token, appliedFilters);

  useEffect(() => setCurrentPage((page) => Math.min(page, totalPages)), [totalPages]);

  const applyFilters = () => {
    const error = validateReportDateRange(filters);
    setFilterError(error);
    if (error) return;
    setAppliedFilters(filters);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters(emptyReportFilters);
    setAppliedFilters(emptyReportFilters);
    setFilterError('');
    setCurrentPage(1);
  };

  return {
    filters,
    setFilters,
    filterError,
    records,
    visibleRecords,
    summary,
    options,
    currentPage: visiblePage,
    setCurrentPage,
    totalPages,
    visibleStart,
    visibleEnd,
    isPending: query.isPending,
    isFetching: query.isFetching,
    queryError: query.error,
    unavailableCatalogs: query.data?.unavailableCatalogs ?? [],
    refresh: () => void query.refetch(),
    applyFilters,
    clearFilters,
    ...reportExport,
  };
}
