import type { Paciente } from "../../types";
import { getPacienteProcedimentosFromPaciente } from "../../shared/domain/cbhpm";

export type BillingChecklistStatus = "ok" | "warning" | "missing";
export type BillingStatusFilter =
  | "all"
  | "paid"
  | "pending"
  | "glosa"
  | "missing";
export type BillingRegimeFilter = "all" | "convenio" | "particular";
export type BillingRecordStatus = "paid" | "pending" | "missing";

export type BillingChecklistItem = {
  label: string;
  value: string;
  status: BillingChecklistStatus;
  hint?: string;
};

export type BillingFilters = {
  search: string;
  medico: string;
  convenio: string;
  hospital: string;
  procedimento: string;
  competenciaInicio: string;
  competenciaFinal: string;
  status: BillingStatusFilter;
  regime: BillingRegimeFilter;
  onlyPendingItems: boolean;
};

export type BillingRecord = {
  id: number;
  paciente: Paciente;
  patientName: string;
  doctorName: string;
  doctorUserId?: number | null;
  assistantNames: string[];
  hospitalName: string;
  convenioName: string;
  regime: "convenio" | "particular";
  surgeryDate: string | null;
  surgeryDateLabel: string;
  competenciaInicio: string | null;
  competenciaFinal: string | null;
  authorizationCode: string;
  paymentRaw: string;
  paymentAmount: number;
  paymentHasNumericValue: boolean;
  glosaRaw: string;
  glosaAmount: number;
  glosaHasNumericValue: boolean;
  assistantFeesAmount?: number | null;
  anesthesiologistFeesAmount?: number | null;
  anesthesiologistName: string;
  anesthesiologistBilledSeparately: boolean;
  guiaInternacaoOuSadt: string;
  tissXmlStatus: string;
  glosaStatus: string;
  recursoGlosa: string;
  repasseMedicoObservacao: string;
  tipoFaturamentoParticular: string;
  reciboNotaContrato: string;
  netAmount: number;
  status: BillingRecordStatus;
  statusLabel: string;
  filesCount: number;
  hasOpme: boolean;
  opmeSupplier: string;
  procedureSummary: string;
  procedureCodes: string[];
  primaryProcedureLabel: string;
  procedures: ReturnType<typeof getPacienteProcedimentosFromPaciente>;
  surgicalPortes: string[];
  billingChecklist: BillingChecklistItem[];
  pendingChecklistItems: number;
};

export type BillingSummary = {
  totalRecords: number;
  totalGrossAmount: number;
  totalGlosaAmount: number;
  totalNetAmount: number;
  paidCount: number;
  pendingCount: number;
  missingAmountCount: number;
  particularCount: number;
  convenioCount: number;
  authorizationCount: number;
  opmeCount: number;
  attachmentCount: number;
  glosaCasesCount: number;
  recordsWithPendingItems: number;
  nonNumericPaymentCount: number;
  nonNumericGlosaCount: number;
};

export type BillingBreakdownItem = {
  label: string;
  totalGrossAmount: number;
  totalNetAmount: number;
  totalGlosaAmount: number;
  totalRecords: number;
  pendingCount: number;
};

export type FilterBillingOptions = {
  restrictToMedicalUser?: boolean;
  currentMedicalUserId?: number | null;
  currentMedicalUserName?: string | null;
};
