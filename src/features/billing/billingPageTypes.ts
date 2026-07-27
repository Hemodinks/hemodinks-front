export type AtendimentoFormState = {
  pacienteId: string;
  dataProcedimento: string;
  hospitalId: string;
  hospital: string;
  convenioId: string;
  convenio: string;
  opmeFornecedorId: string;
  opmeFornecedor: string;
  medicoResponsavelId: string;
  medicoAuxiliar1Id: string;
  medicoAuxiliar2Id: string;
  diagnostico: string;
  tratamentoMedico: string;
  cbhpmCodigo: string;
  descricao: string;
  quantidade: string;
  pesoPercentual: string;
  numeroAutorizacao: string;
  valorGlosa: string;
  motivoGlosa: string;
  status: string;
};

export type AtendimentoProcedureDraft = {
  cbhpmCodigo: string | null;
  descricao: string | null;
  porte?: string | null;
  valorReferencia?: number | null;
  quantidade: number;
  pesoPercentual: number;
};

export type FaturamentoFormState = {
  atendimentoCirurgicoId: string;
  competencia: string;
  numeroGuia: string;
  numeroLote: string;
  observacao: string;
};

export type FinanceFiltersState = {
  competencia: string;
  vencimentoInicio: string;
  vencimentoFim: string;
  convenioId: string;
  medicoId: string;
  pacienteId: string;
  status: string;
  termo: string;
};

export type FinancePageState = {
  page: number;
  totalPages: number;
  totalItems: number;
};

export type ReceiptFormState = {
  contaId: string;
  valor: string;
  forma: string;
  referencia: string;
  comprovanteFormato: GeneratedReceiptFormat;
  comprovante: File | null;
};

export type ReceiptToastState = {
  type: "success" | "error";
  message: string;
};

export type PriceFormState = {
  convenioId: string;
  cbhpmCodigo: string;
  valorNegociado: string;
  percentualPrincipal: string;
  percentualAuxiliar1: string;
  percentualAuxiliar2: string;
  vigenciaInicio: string;
  vigenciaFinal: string;
};

export type BillingReturnDraft = {
  faturamentoItemId: number;
  descricao: string;
  valorApresentado: number;
  valorGlosado: string;
  motivoGlosa: string;
};

export type AppealDraftState = {
  justificativa: string;
  valorRecuperado: string;
};

export type GlosaDraftState = {
  id: number;
  codigoMotivo: string;
  descricaoMotivo: string;
  valorGlosado: string;
  dataGlosa: string;
  observacao: string;
};

export type RecursoDraftState = {
  id: number;
  dataEnvio: string;
  justificativa: string;
  valorRecorrido: string;
  dataResposta: string;
  valorRecuperado: string;
  status: string;
  observacao: string;
};
import type { GeneratedReceiptFormat } from "./receiptDocument";
