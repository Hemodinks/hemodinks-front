import type { AtendimentoCirurgico, ContaReceber, ConvenioProcedimentoPreco, Faturamento } from '../types';
import { get, post, put } from './api';

export const getAtendimentos = (token: string) => get<AtendimentoCirurgico[]>('/api/atendimentos-cirurgicos/', token);
export const createAtendimento = (payload: object, token: string) => post<AtendimentoCirurgico>('/api/atendimentos-cirurgicos/', payload, token);
export const getFaturamentos = (token: string) => get<Faturamento[]>('/api/faturamentos/', token);
export const createFaturamento = (payload: object, token: string) => post<Faturamento>('/api/faturamentos/', payload, token);
export const updateFaturamentoStatus = (id: number, payload: object, token: string) => put<Faturamento>(`/api/faturamentos/${id}/status`, payload, token);
export const registrarRetornoFaturamento = (id: number, payload: object, token: string) => post<Faturamento>(`/api/faturamentos/${id}/retorno`, payload, token);
export const registrarRecursoGlosa = (glosaId: number, payload: object, token: string) => post<Faturamento>(`/api/faturamentos/glosas/${glosaId}/recursos`, payload, token);
export const getContasReceber = (token: string) => get<ContaReceber[]>('/api/financeiro/contas-receber/', token);
export const gerarContaReceber = (faturamentoId: number, payload: object, token: string) => post<ContaReceber>(`/api/faturamentos/${faturamentoId}/contas-receber`, payload, token);
export const registrarRecebimento = (contaId: number, payload: object, token: string) => post<ContaReceber>(`/api/financeiro/contas-receber/${contaId}/recebimentos`, payload, token);
export const estornarRecebimento = (recebimentoId: number, motivoEstorno: string, token: string) => post<ContaReceber>(`/api/financeiro/contas-receber/recebimentos/${recebimentoId}/estorno`, { recebimentoId, motivoEstorno, usuarioEstornoId: 0 }, token);
export const getConvenioProcedimentoPrecos = (token: string) => get<ConvenioProcedimentoPreco[]>('/api/convenios-procedimentos-precos/', token);
export const saveConvenioProcedimentoPreco = (payload: object, token: string) => post<ConvenioProcedimentoPreco>('/api/convenios-procedimentos-precos/', payload, token);
