import { useState, type SetStateAction } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Faturamento } from '../billingDomainTypes';
import {
  createFaturamento,
  deleteFaturamento,
  deleteGlosa,
  deleteRecursoGlosa,
  gerarContaReceber,
  getAtendimentos,
  getFaturamentos,
  registrarRecursoGlosa,
  registrarRetornoFaturamento,
  updateFaturamento,
  updateFaturamentoItem,
  updateFaturamentoStatus,
  updateGlosa,
  updateRecursoGlosa,
} from '../../../services';
import type {
  ContaReceberCreatePayload,
  FaturamentoItemPayload,
  FaturamentoPayload,
  FaturamentoStatusPayload,
  GlosaUpdatePayload,
  RecursoGlosaPayload,
  RecursoGlosaUpdatePayload,
  RetornoFaturamentoPayload,
} from '../../../services/financeiroService';
import type {
  AppealDraftState,
  BillingReturnDraft,
  FaturamentoFormState,
  GlosaDraftState,
  RecursoDraftState,
} from '../billingPageTypes';
import { queryKeys } from '../../../shared/queryKeys';
import type { AtendimentoCirurgico } from '../billingDomainTypes';

type InvoicingWorkspaceData = {
  faturamentos: Faturamento[];
  atendimentos: AtendimentoCirurgico[];
};

export function createInitialFaturamentoForm(): FaturamentoFormState {
  return {
    atendimentoCirurgicoId: '',
    competencia: new Date().toISOString().slice(0, 7),
    numeroGuia: '',
    numeroLote: '',
    observacao: '',
  };
}

export function useInvoicing(token = '') {
  const queryClient = useQueryClient();
  const workspaceQuery = useQuery({
    queryKey: queryKeys.billingInvoicing(token),
    queryFn: async (): Promise<InvoicingWorkspaceData> => {
      const [atendimentos, faturamentos] = await Promise.all([
        getAtendimentos(token),
        getFaturamentos(token),
      ]);
      return { atendimentos, faturamentos };
    },
    enabled: false,
  });
  const workspace = workspaceQuery.data ?? { faturamentos: [], atendimentos: [] };
  const setFaturamentos = (value: SetStateAction<Faturamento[]>) => {
    queryClient.setQueryData<InvoicingWorkspaceData>(
      queryKeys.billingInvoicing(token),
      (current) => {
        const base = current ?? workspace;
        const faturamentos = typeof value === 'function' ? value(base.faturamentos) : value;
        return { ...base, faturamentos };
      },
    );
  };
  const [editingBillingId, setEditingBillingId] = useState<number | null>(null);
  const [faturamentoForm, setFaturamentoForm] = useState(createInitialFaturamentoForm);
  const [returnTarget, setReturnTarget] = useState<Faturamento | null>(null);
  const [returnDraft, setReturnDraft] = useState<BillingReturnDraft[]>([]);
  const [appealTarget, setAppealTarget] = useState<{
    glosaId: number;
    valorGlosado: number;
  } | null>(null);
  const [appealDraft, setAppealDraft] = useState<AppealDraftState>({
    justificativa: '',
    valorRecuperado: '0',
  });
  const [selectedBilling, setSelectedBilling] = useState<Faturamento | null>(null);
  const [billingItemDraft, setBillingItemDraft] = useState<{
    itemId: number;
    codigo: string;
    descricao: string;
    quantidade: string;
    pesoPercentual: string;
    valorUnitario: string;
  } | null>(null);
  const [glosaDraft, setGlosaDraft] = useState<GlosaDraftState | null>(null);
  const [recursoDraft, setRecursoDraft] = useState<RecursoDraftState | null>(null);
  const loadInvoicing = async (_token: string) => {
    const result = await workspaceQuery.refetch();
    return result.data?.atendimentos ?? [];
  };
  const saveInvoice = (id: number | null, payload: FaturamentoPayload, token: string) =>
    id ? updateFaturamento(id, payload, token) : createFaturamento(payload, token);
  const removeInvoice = (id: number, token: string) => deleteFaturamento(id, token);
  const changeInvoiceStatus = (id: number, payload: FaturamentoStatusPayload, token: string) =>
    updateFaturamentoStatus(id, payload, token);
  const createReceivable = (id: number, payload: ContaReceberCreatePayload, token: string) =>
    gerarContaReceber(id, payload, token);
  const registerReturn = (id: number, payload: RetornoFaturamentoPayload, token: string) =>
    registrarRetornoFaturamento(id, payload, token);
  const registerAppeal = (id: number, payload: RecursoGlosaPayload, token: string) =>
    registrarRecursoGlosa(id, payload, token);
  const saveGlosaRecord = (id: number, payload: GlosaUpdatePayload, token: string) =>
    updateGlosa(id, payload, token);
  const removeGlosa = (id: number, token: string) => deleteGlosa(id, token);
  const saveAppealRecord = (id: number, payload: RecursoGlosaUpdatePayload, token: string) =>
    updateRecursoGlosa(id, payload, token);
  const removeAppeal = (id: number, token: string) => deleteRecursoGlosa(id, token);
  const saveInvoiceItem = (
    invoiceId: number,
    itemId: number,
    payload: FaturamentoItemPayload,
    token: string,
  ) => updateFaturamentoItem(invoiceId, itemId, payload, token);

  return {
    faturamentos: workspace.faturamentos,
    setFaturamentos,
    editingBillingId,
    setEditingBillingId,
    faturamentoForm,
    setFaturamentoForm,
    returnTarget,
    setReturnTarget,
    returnDraft,
    setReturnDraft,
    appealTarget,
    setAppealTarget,
    appealDraft,
    setAppealDraft,
    selectedBilling,
    setSelectedBilling,
    billingItemDraft,
    setBillingItemDraft,
    glosaDraft,
    setGlosaDraft,
    recursoDraft,
    setRecursoDraft,
    loadInvoicing,
    saveInvoice,
    removeInvoice,
    changeInvoiceStatus,
    createReceivable,
    registerReturn,
    registerAppeal,
    saveGlosaRecord,
    removeGlosa,
    saveAppealRecord,
    removeAppeal,
    saveInvoiceItem,
  };
}
