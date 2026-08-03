export type NamedMedicalUser = {
  nome: string;
  perfilId?: number;
  perfilNome?: string | null;
};

export type MedicalUserLookup = {
  id: number;
  nome: string;
};

export type HealthPlanLookup = {
  idConvenio: number;
  descricaoConvenio: string;
};

export type HospitalLookup = {
  id: number;
  nome: string;
};

export type OpmeSupplierLookup = {
  idFornecedor: number;
  fornecedor: string;
};

export type CbhpmResult = {
  id: number;
  codigo: string;
  procedimento: string;
  porte?: string | null;
  custoOperacional?: number | null;
  valorReferencia?: number | null;
};

export type ProcedureReference = {
  cbhpmCodigo?: string | null;
  cbhpmPorte?: string | null;
  procedimento: string;
  valorReferencia?: number | null;
};

export type PatientProcedureSource = {
  procedimentos?: ProcedureReference[];
  cbhpmCodigo?: string | null;
  cbhpmPorte?: string | null;
  procedimento?: string | null;
};
