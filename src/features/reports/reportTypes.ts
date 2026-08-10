import type { BillingRecord, BillingRegimeFilter, BillingStatusFilter, BillingSummary } from '../billing/billingTypes';
import type { MedicalGroup, Team } from '../../types';

export type ReportFilters = {
  startDate: string;
  endDate: string;
  doctors: string[];
  teams: string[];
  medicalGroups: string[];
  hospitals: string[];
  convenios: string[];
  procedures: string[];
  opmeSuppliers: string[];
  status: BillingStatusFilter;
  regime: BillingRegimeFilter;
  onlyPendingItems: boolean;
};

export type ReportRecord = BillingRecord & {
  teamNames: string[];
  medicalGroupNames: string[];
};

export type ReportCatalogs = {
  medicalGroups: MedicalGroup[];
  teams: Team[];
  unavailableCatalogs: string[];
};

export type ReportData = ReportCatalogs & {
  records: BillingRecord[];
};

export type ReportSummary = BillingSummary;

export type ReportExportFormat = 'pdf' | 'xlsx';
