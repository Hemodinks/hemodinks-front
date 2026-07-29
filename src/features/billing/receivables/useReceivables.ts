import { useMemo, useState, type SetStateAction } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContaReceber, FinanceiroResumo } from '../billingDomainTypes';
import {
  cancelContaReceber,
  downloadComprovanteRecebimento,
  estornarRecebimento,
  getFinanceiroResumo,
  getPacientes,
  registrarRecebimento,
  searchContasReceber,
  updateContaReceber,
  uploadComprovanteRecebimento,
} from '../../../services';
import type {
  ContaReceberCancelPayload,
  ContaReceberUpdatePayload,
  FinanceSearchParams,
  FinanceSummaryParams,
  RecebimentoPayload,
} from '../../../services/financeiroService';
import type {
  FinanceFiltersState,
  FinancePageState,
  ReceiptFormState,
  ReceiptToastState,
} from '../billingPageTypes';
import type { Paciente } from '../../../shared/domain/clinicalContracts';
import { queryKeys } from '../../../shared/queryKeys';

type ReceivablesWorkspaceData = {
  contas: ContaReceber[];
  pacientes: Paciente[];
  resumo: FinanceiroResumo | null;
  page: FinancePageState;
};

export function useReceivables(token = '') {
  const queryClient = useQueryClient();
  const workspaceQuery = useQuery({
    queryKey: queryKeys.billingReceivables(token),
    queryFn: async (): Promise<ReceivablesWorkspaceData> => {
      const [pagedAccounts, patientPage, resumo] = await Promise.all([
        searchContasReceber({ page: 1, pageSize: 10 }, token),
        getPacientes(token, { page: 1, pageSize: 100 }),
        getFinanceiroResumo({}, token),
      ]);
      return {
        contas: pagedAccounts.items,
        pacientes: patientPage.items,
        resumo,
        page: {
          page: pagedAccounts.page,
          totalPages: pagedAccounts.totalPages,
          totalItems: pagedAccounts.totalItems,
        },
      };
    },
    enabled: false,
  });
  const workspace: ReceivablesWorkspaceData = workspaceQuery.data ?? {
    contas: [],
    pacientes: [],
    resumo: null,
    page: { page: 1, totalPages: 1, totalItems: 0 },
  };
  const updateWorkspace = <K extends keyof ReceivablesWorkspaceData>(
    key: K,
    value: SetStateAction<ReceivablesWorkspaceData[K]>,
  ) => {
    queryClient.setQueryData<ReceivablesWorkspaceData>(
      queryKeys.billingReceivables(token),
      (current) => {
        const base = current ?? workspace;
        const nextValue =
          typeof value === 'function'
            ? (value as (previous: ReceivablesWorkspaceData[K]) => ReceivablesWorkspaceData[K])(
                base[key],
              )
            : value;
        return { ...base, [key]: nextValue };
      },
    );
  };
  const setContas = (value: SetStateAction<ContaReceber[]>) => updateWorkspace('contas', value);
  const setFinanceiroResumo = (value: SetStateAction<FinanceiroResumo | null>) =>
    updateWorkspace('resumo', value);
  const [receiptToast, setReceiptToast] = useState<ReceiptToastState | null>(null);
  const [receipt, setReceipt] = useState<ReceiptFormState>({
    contaId: '',
    valor: '',
    forma: 'Pix',
    referencia: '',
    comprovanteFormato: 'pdf',
    comprovante: null,
  });
  const [reversalTarget, setReversalTarget] = useState<{
    id: number;
    valor: number;
  } | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const setFinancePage = (value: SetStateAction<FinancePageState>) =>
    updateWorkspace('page', value);
  const [financeFilters, setFinanceFilters] = useState<FinanceFiltersState>({
    competencia: '',
    vencimentoInicio: '',
    vencimentoFim: '',
    convenioId: '',
    medicoId: '',
    pacienteId: '',
    status: '',
    termo: '',
  });
  const [selectedAccount, setSelectedAccount] = useState<ContaReceber | null>(null);
  const [accountDraft, setAccountDraft] = useState<{
    numeroDocumento: string;
    descricao: string;
    dataEmissao: string;
    dataVencimento: string;
    valorOriginal: string;
    valorAjustado: string;
    observacao: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const openBalance = useMemo(
    () =>
      workspace.contas
        .filter((item) => item.status !== 'Cancelado')
        .reduce((sum, item) => sum + item.saldoAberto, 0),
    [workspace.contas],
  );
  const received = useMemo(
    () => workspace.contas.reduce((sum, item) => sum + item.valorRecebido, 0),
    [workspace.contas],
  );
  const loadReceivables = async (_token: string) => {
    const result = await workspaceQuery.refetch();
    return result.data?.pacientes ?? [];
  };
  const reverseReceipt = (id: number, reason: string, token: string) =>
    estornarRecebimento(id, reason, token);
  const registerReceipt = (id: number, payload: RecebimentoPayload, token: string) =>
    registrarRecebimento(id, payload, token);
  const uploadReceipt = (id: number, file: File, token: string) =>
    uploadComprovanteRecebimento(id, file, token);
  const searchReceivables = (params: FinanceSearchParams, token: string) =>
    searchContasReceber(params, token);
  const loadSummary = (params: FinanceSummaryParams, token: string) =>
    getFinanceiroResumo(params, token);
  const saveReceivable = (id: number, payload: ContaReceberUpdatePayload, token: string) =>
    updateContaReceber(id, payload, token);
  const cancelReceivable = (id: number, payload: ContaReceberCancelPayload, token: string) =>
    cancelContaReceber(id, payload, token);
  const downloadReceiptFile = (id: number, token: string) =>
    downloadComprovanteRecebimento(id, token);

  return {
    contas: workspace.contas,
    setContas,
    receiptToast,
    setReceiptToast,
    receipt,
    setReceipt,
    reversalTarget,
    setReversalTarget,
    reversalReason,
    setReversalReason,
    financeiroResumo: workspace.resumo,
    setFinanceiroResumo,
    financePage: workspace.page,
    setFinancePage,
    financeFilters,
    setFinanceFilters,
    selectedAccount,
    setSelectedAccount,
    accountDraft,
    setAccountDraft,
    cancelReason,
    setCancelReason,
    openBalance,
    received,
    loadReceivables,
    reverseReceipt,
    registerReceipt,
    uploadReceipt,
    searchReceivables,
    loadSummary,
    saveReceivable,
    cancelReceivable,
    downloadReceiptFile,
  };
}
