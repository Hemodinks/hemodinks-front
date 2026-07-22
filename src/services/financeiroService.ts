import type {
  AtendimentoCirurgico,
  ContaReceber,
  ConvenioProcedimentoPreco,
  Faturamento,
  FinanceiroResumo,
  PacienteFinanceiroResumo,
  PagedResult,
} from "../types";
import { del, get, getBlob, post, put, upload } from "./api";

export const getAtendimentos = (token: string) =>
  get<AtendimentoCirurgico[]>("/api/atendimentos-cirurgicos/", token);
export const createAtendimento = (payload: object, token: string) =>
  post<AtendimentoCirurgico>("/api/atendimentos-cirurgicos/", payload, token);
export const getAtendimento = (id: number, token: string) =>
  get<AtendimentoCirurgico>(`/api/atendimentos-cirurgicos/${id}`, token);
export const updateAtendimento = (id: number, payload: object, token: string) =>
  put<AtendimentoCirurgico>(
    `/api/atendimentos-cirurgicos/${id}`,
    payload,
    token,
  );
export const deleteAtendimento = (id: number, token: string) =>
  del<void>(`/api/atendimentos-cirurgicos/${id}`, token);
export const getFaturamentos = (token: string) =>
  get<Faturamento[]>("/api/faturamentos/", token);
export const createFaturamento = (payload: object, token: string) =>
  post<Faturamento>("/api/faturamentos/", payload, token);
export const getFaturamento = (id: number, token: string) =>
  get<Faturamento>(`/api/faturamentos/${id}`, token);
export const updateFaturamento = (id: number, payload: object, token: string) =>
  put<Faturamento>(`/api/faturamentos/${id}`, payload, token);
export const updateFaturamentoItem = (
  id: number,
  itemId: number,
  payload: object,
  token: string,
) =>
  put<Faturamento>(`/api/faturamentos/${id}/itens/${itemId}`, payload, token);
export const deleteFaturamento = (id: number, token: string) =>
  del<void>(`/api/faturamentos/${id}`, token);
export const searchFaturamentos = (params: object, token: string) =>
  get<PagedResult<Faturamento>>("/api/faturamentos/pesquisa", token, {
    params,
  });
export const updateFaturamentoStatus = (
  id: number,
  payload: object,
  token: string,
) => put<Faturamento>(`/api/faturamentos/${id}/status`, payload, token);
export const registrarRetornoFaturamento = (
  id: number,
  payload: object,
  token: string,
) => post<Faturamento>(`/api/faturamentos/${id}/retorno`, payload, token);
export const registrarRecursoGlosa = (
  glosaId: number,
  payload: object,
  token: string,
) =>
  post<Faturamento>(
    `/api/faturamentos/glosas/${glosaId}/recursos`,
    payload,
    token,
  );
export const updateGlosa = (id: number, payload: object, token: string) =>
  put<Faturamento>(`/api/faturamentos/glosas/${id}`, payload, token);
export const deleteGlosa = (id: number, token: string) =>
  del<Faturamento>(`/api/faturamentos/glosas/${id}`, token);
export const updateRecursoGlosa = (
  id: number,
  payload: object,
  token: string,
) => put<Faturamento>(`/api/faturamentos/recursos-glosa/${id}`, payload, token);
export const deleteRecursoGlosa = (id: number, token: string) =>
  del<Faturamento>(`/api/faturamentos/recursos-glosa/${id}`, token);
export const getContasReceber = (token: string) =>
  get<ContaReceber[]>("/api/financeiro/contas-receber/", token);
export const getContaReceber = (id: number, token: string) =>
  get<ContaReceber>(`/api/financeiro/contas-receber/${id}`, token);
export const searchContasReceber = (params: object, token: string) =>
  get<PagedResult<ContaReceber>>(
    "/api/financeiro/contas-receber/pesquisa",
    token,
    { params },
  );
export const updateContaReceber = (
  id: number,
  payload: object,
  token: string,
) => put<ContaReceber>(`/api/financeiro/contas-receber/${id}`, payload, token);
export const cancelContaReceber = (
  id: number,
  payload: object,
  token: string,
) =>
  post<ContaReceber>(
    `/api/financeiro/contas-receber/${id}/cancelamento`,
    payload,
    token,
  );
export const gerarContaReceber = (
  faturamentoId: number,
  payload: object,
  token: string,
) =>
  post<ContaReceber>(
    `/api/faturamentos/${faturamentoId}/contas-receber`,
    payload,
    token,
  );
export const registrarRecebimento = (
  contaId: number,
  payload: object,
  token: string,
) =>
  post<ContaReceber>(
    `/api/financeiro/contas-receber/${contaId}/recebimentos`,
    payload,
    token,
  );
export const estornarRecebimento = (
  recebimentoId: number,
  motivoEstorno: string,
  token: string,
) =>
  post<ContaReceber>(
    `/api/financeiro/contas-receber/recebimentos/${recebimentoId}/estorno`,
    { recebimentoId, motivoEstorno, usuarioEstornoId: 0 },
    token,
  );
export const uploadComprovanteRecebimento = (
  recebimentoId: number,
  file: File,
  token: string,
) => {
  const body = new FormData();
  body.append("arquivo", file);
  return upload<{
    recebimentoId: number;
    nome: string;
    contentType: string;
    tamanho: number;
    url: string;
  }>(
    `/api/financeiro/contas-receber/recebimentos/${recebimentoId}/comprovante`,
    body,
    token,
  );
};
export const downloadComprovanteRecebimento = (
  recebimentoId: number,
  token: string,
) =>
  getBlob(
    `/api/financeiro/contas-receber/recebimentos/${recebimentoId}/comprovante`,
    token,
  );
export const getConvenioProcedimentoPrecos = (
  token: string,
  params: object = {},
) =>
  get<ConvenioProcedimentoPreco[]>(
    "/api/convenios-procedimentos-precos/",
    token,
    { params },
  );
export const saveConvenioProcedimentoPreco = (payload: object, token: string) =>
  post<ConvenioProcedimentoPreco>(
    "/api/convenios-procedimentos-precos/",
    payload,
    token,
  );
export const updateConvenioProcedimentoPreco = (
  id: number,
  payload: object,
  token: string,
) =>
  put<ConvenioProcedimentoPreco>(
    `/api/convenios-procedimentos-precos/${id}`,
    payload,
    token,
  );
export const deactivateConvenioProcedimentoPreco = (
  id: number,
  token: string,
) => del<void>(`/api/convenios-procedimentos-precos/${id}`, token);
export const getFinanceiroResumo = (params: object, token: string) =>
  get<FinanceiroResumo>("/api/financeiro/relatorios/resumo", token, { params });
export const getPacienteFinanceiroResumo = (
  pacienteId: number,
  token: string,
) =>
  get<PacienteFinanceiroResumo>(
    `/api/pacientes/${pacienteId}/resumo-financeiro`,
    token,
  );
