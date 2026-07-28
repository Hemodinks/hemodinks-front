import type {
  AtendimentoCirurgico,
  ContaReceber,
  ConvenioProcedimentoPreco,
  Faturamento,
  FaturamentoStatus,
  FinanceiroResumo,
  PacienteFinanceiroResumo,
} from '../features/billing/billingDomainTypes';
import type { PagedResult } from '../shared/domain/apiTypes';
import { del, get, getBlob, post, put, upload } from './api';

type Nullable<T> = T | null;

export type AtendimentoPayload = {
  pacienteId: number;
  dataProcedimento: string;
  hospitalId: Nullable<number>;
  hospital: Nullable<string>;
  convenioId: Nullable<number>;
  convenio: Nullable<string>;
  opmeFornecedorId: Nullable<number>;
  opmeFornecedor: Nullable<string>;
  medicoResponsavelId: number;
  medicoAuxiliar1Id: Nullable<number>;
  medicoAuxiliar2Id: Nullable<number>;
  diagnostico: Nullable<string>;
  tratamentoMedico: Nullable<string>;
  numeroAutorizacao: Nullable<string>;
  valorGlosa: Nullable<number>;
  motivoGlosa: Nullable<string>;
  status: string;
  procedimentos: Array<{
    cbhpmCodigo: Nullable<string>;
    descricao: Nullable<string>;
    quantidade: number;
    pesoPercentual: number;
    cbhpmPorte: Nullable<string>;
  }>;
};

export type FaturamentoPayload = {
  atendimentoCirurgicoId: number;
  numeroGuia: Nullable<string>;
  numeroLote: Nullable<string>;
  competencia: string;
  observacao: Nullable<string>;
  rowVersion?: string;
};

export type FaturamentoItemPayload = {
  faturamentoId: number;
  itemId: number;
  codigo: Nullable<string>;
  descricao: string;
  quantidade: number;
  pesoPercentual: number;
  valorUnitario: number;
  rowVersion: string;
};

export type FaturamentoSearchParams = {
  page?: number;
  pageSize?: number;
  termo?: string;
  status?: string;
};

export type FaturamentoStatusPayload = {
  id: number;
  status: FaturamentoStatus;
  rowVersion: string;
};

export type RetornoFaturamentoPayload = {
  id: number;
  dataRetorno: string;
  itens: Array<{
    faturamentoItemId: number;
    valorGlosado: number;
    valorAprovado: number;
    codigoMotivo: Nullable<string>;
    motivoGlosa: Nullable<string>;
  }>;
  rowVersion: string;
};

export type RecursoGlosaPayload = {
  glosaId: number;
  dataEnvio: string;
  justificativa: string;
  valorRecorrido: number;
  dataResposta: Nullable<string>;
  valorRecuperado: number;
  status: string;
  observacao: Nullable<string>;
};

export type GlosaUpdatePayload = {
  id: number;
  codigoMotivo: Nullable<string>;
  descricaoMotivo: string;
  valorGlosado: number;
  dataGlosa: string;
  observacao: Nullable<string>;
};

export type RecursoGlosaUpdatePayload = {
  id: number;
  dataEnvio: Nullable<string>;
  justificativa: string;
  valorRecorrido: number;
  dataResposta: Nullable<string>;
  valorRecuperado: number;
  status: string;
  observacao: Nullable<string>;
};

export type FinanceSearchParams = {
  page?: number;
  pageSize?: number;
  termo?: string;
  status?: string;
  vencimentoInicio?: string;
  vencimentoFim?: string;
  convenioId?: string;
  medicoId?: string;
  pacienteId?: string;
};

export type FinanceSummaryParams = {
  inicio?: string;
  fim?: string;
  convenioId?: string;
  medicoId?: string;
  pacienteId?: string;
};

export type ContaReceberUpdatePayload = {
  id: number;
  numeroDocumento: string;
  descricao: string;
  dataEmissao: string;
  dataVencimento: string;
  valorOriginal: number;
  valorAjustado: number;
  observacao: Nullable<string>;
  rowVersion: string;
};

export type ContaReceberCancelPayload = {
  id: number;
  motivo: string;
  rowVersion: string;
};

export type ContaReceberCreatePayload = {
  faturamentoId: number;
  numeroDocumento: string;
  descricao: string;
  dataEmissao: string;
  dataVencimento: string;
  valorOriginal: Nullable<number>;
  valorAjustado: Nullable<number>;
  observacao: Nullable<string>;
};

export type RecebimentoPayload = {
  contaReceberId: number;
  dataRecebimento: string;
  valorRecebido: number;
  formaRecebimento: string;
  referenciaBancaria: Nullable<string>;
  documentoComprovante: Nullable<string>;
  observacao: Nullable<string>;
  usuarioCadastroId: number;
  rowVersion: string;
};

export type ProcedurePricePayload = Omit<ConvenioProcedimentoPreco, 'id'> & {
  id: Nullable<number>;
};

export type ProcedurePriceParams = {
  convenioId?: number;
  cbhpmCodigo?: string;
  ativo?: boolean;
};

export const getAtendimentos = (token: string) =>
  get<AtendimentoCirurgico[]>('/api/atendimentos-cirurgicos/', token);
export const createAtendimento = (payload: AtendimentoPayload, token: string) =>
  post<AtendimentoCirurgico>('/api/atendimentos-cirurgicos/', payload, token);
export const getAtendimento = (id: number, token: string) =>
  get<AtendimentoCirurgico>(`/api/atendimentos-cirurgicos/${id}`, token);
export const updateAtendimento = (id: number, payload: AtendimentoPayload, token: string) =>
  put<AtendimentoCirurgico>(`/api/atendimentos-cirurgicos/${id}`, payload, token);
export const deleteAtendimento = (id: number, token: string) =>
  del<void>(`/api/atendimentos-cirurgicos/${id}`, token);
export const getFaturamentos = (token: string) => get<Faturamento[]>('/api/faturamentos/', token);
export const createFaturamento = (payload: FaturamentoPayload, token: string) =>
  post<Faturamento>('/api/faturamentos/', payload, token);
export const getFaturamento = (id: number, token: string) =>
  get<Faturamento>(`/api/faturamentos/${id}`, token);
export const updateFaturamento = (id: number, payload: FaturamentoPayload, token: string) =>
  put<Faturamento>(`/api/faturamentos/${id}`, payload, token);
export const updateFaturamentoItem = (
  id: number,
  itemId: number,
  payload: FaturamentoItemPayload,
  token: string,
) => put<Faturamento>(`/api/faturamentos/${id}/itens/${itemId}`, payload, token);
export const deleteFaturamento = (id: number, token: string) =>
  del<void>(`/api/faturamentos/${id}`, token);
export const searchFaturamentos = (params: FaturamentoSearchParams, token: string) =>
  get<PagedResult<Faturamento>>('/api/faturamentos/pesquisa', token, {
    params,
  });
export const updateFaturamentoStatus = (
  id: number,
  payload: FaturamentoStatusPayload,
  token: string,
) => put<Faturamento>(`/api/faturamentos/${id}/status`, payload, token);
export const registrarRetornoFaturamento = (
  id: number,
  payload: RetornoFaturamentoPayload,
  token: string,
) => post<Faturamento>(`/api/faturamentos/${id}/retorno`, payload, token);
export const registrarRecursoGlosa = (
  glosaId: number,
  payload: RecursoGlosaPayload,
  token: string,
) => post<Faturamento>(`/api/faturamentos/glosas/${glosaId}/recursos`, payload, token);
export const updateGlosa = (id: number, payload: GlosaUpdatePayload, token: string) =>
  put<Faturamento>(`/api/faturamentos/glosas/${id}`, payload, token);
export const deleteGlosa = (id: number, token: string) =>
  del<Faturamento>(`/api/faturamentos/glosas/${id}`, token);
export const updateRecursoGlosa = (id: number, payload: RecursoGlosaUpdatePayload, token: string) =>
  put<Faturamento>(`/api/faturamentos/recursos-glosa/${id}`, payload, token);
export const deleteRecursoGlosa = (id: number, token: string) =>
  del<Faturamento>(`/api/faturamentos/recursos-glosa/${id}`, token);
export const getContasReceber = (token: string) =>
  get<ContaReceber[]>('/api/financeiro/contas-receber/', token);
export const getContaReceber = (id: number, token: string) =>
  get<ContaReceber>(`/api/financeiro/contas-receber/${id}`, token);
export const searchContasReceber = (params: FinanceSearchParams, token: string) =>
  get<PagedResult<ContaReceber>>('/api/financeiro/contas-receber/pesquisa', token, { params });
export const updateContaReceber = (id: number, payload: ContaReceberUpdatePayload, token: string) =>
  put<ContaReceber>(`/api/financeiro/contas-receber/${id}`, payload, token);
export const cancelContaReceber = (id: number, payload: ContaReceberCancelPayload, token: string) =>
  post<ContaReceber>(`/api/financeiro/contas-receber/${id}/cancelamento`, payload, token);
export const gerarContaReceber = (
  faturamentoId: number,
  payload: ContaReceberCreatePayload,
  token: string,
) => post<ContaReceber>(`/api/faturamentos/${faturamentoId}/contas-receber`, payload, token);
export const registrarRecebimento = (contaId: number, payload: RecebimentoPayload, token: string) =>
  post<ContaReceber>(`/api/financeiro/contas-receber/${contaId}/recebimentos`, payload, token);
export const estornarRecebimento = (recebimentoId: number, motivoEstorno: string, token: string) =>
  post<ContaReceber>(
    `/api/financeiro/contas-receber/recebimentos/${recebimentoId}/estorno`,
    { recebimentoId, motivoEstorno, usuarioEstornoId: 0 },
    token,
  );
export const uploadComprovanteRecebimento = (recebimentoId: number, file: File, token: string) => {
  const body = new FormData();
  body.append('arquivo', file);
  return upload<{
    recebimentoId: number;
    nome: string;
    contentType: string;
    tamanho: number;
    url: string;
  }>(`/api/financeiro/contas-receber/recebimentos/${recebimentoId}/comprovante`, body, token);
};
export const downloadComprovanteRecebimento = (recebimentoId: number, token: string) =>
  getBlob(`/api/financeiro/contas-receber/recebimentos/${recebimentoId}/comprovante`, token);
export const getConvenioProcedimentoPrecos = (token: string, params: ProcedurePriceParams = {}) =>
  get<ConvenioProcedimentoPreco[]>('/api/convenios-procedimentos-precos/', token, { params });
export const saveConvenioProcedimentoPreco = (payload: ProcedurePricePayload, token: string) =>
  post<ConvenioProcedimentoPreco>('/api/convenios-procedimentos-precos/', payload, token);
export const updateConvenioProcedimentoPreco = (
  id: number,
  payload: ProcedurePricePayload,
  token: string,
) => put<ConvenioProcedimentoPreco>(`/api/convenios-procedimentos-precos/${id}`, payload, token);
export const deactivateConvenioProcedimentoPreco = (id: number, token: string) =>
  del<void>(`/api/convenios-procedimentos-precos/${id}`, token);
export const getFinanceiroResumo = (params: FinanceSummaryParams, token: string) =>
  get<FinanceiroResumo>('/api/financeiro/relatorios/resumo', token, { params });
export const getPacienteFinanceiroResumo = (pacienteId: number, token: string) =>
  get<PacienteFinanceiroResumo>(`/api/pacientes/${pacienteId}/resumo-financeiro`, token);
