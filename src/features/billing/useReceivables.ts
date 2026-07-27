import { useMemo, useState } from "react";
import type { ContaReceber, FinanceiroResumo } from "../../types";
import {
  cancelContaReceber,
  downloadComprovanteRecebimento,
  estornarRecebimento,
  getContasReceber,
  getFinanceiroResumo,
  getPacientes,
  registrarRecebimento,
  searchContasReceber,
  updateContaReceber,
  uploadComprovanteRecebimento,
} from "../../services";
import type {
  ContaReceberCancelPayload,
  ContaReceberUpdatePayload,
  FinanceSearchParams,
  FinanceSummaryParams,
  RecebimentoPayload,
} from "../../services/financeiroService";
import type {
  FinanceFiltersState,
  FinancePageState,
  ReceiptFormState,
  ReceiptToastState,
} from "./billingPageTypes";

export function useReceivables() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [receiptToast, setReceiptToast] =
    useState<ReceiptToastState | null>(null);
  const [receipt, setReceipt] = useState<ReceiptFormState>({
    contaId: "",
    valor: "",
    forma: "Pix",
    referencia: "",
    comprovanteFormato: "pdf",
    comprovante: null,
  });
  const [reversalTarget, setReversalTarget] = useState<{
    id: number;
    valor: number;
  } | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [financeiroResumo, setFinanceiroResumo] =
    useState<FinanceiroResumo | null>(null);
  const [financePage, setFinancePage] = useState<FinancePageState>({
    page: 1,
    totalPages: 1,
    totalItems: 0,
  });
  const [financeFilters, setFinanceFilters] = useState<FinanceFiltersState>({
    competencia: "",
    vencimentoInicio: "",
    vencimentoFim: "",
    convenioId: "",
    medicoId: "",
    pacienteId: "",
    status: "",
    termo: "",
  });
  const [selectedAccount, setSelectedAccount] = useState<ContaReceber | null>(
    null,
  );
  const [accountDraft, setAccountDraft] = useState<{
    numeroDocumento: string;
    descricao: string;
    dataEmissao: string;
    dataVencimento: string;
    valorOriginal: string;
    valorAjustado: string;
    observacao: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const openBalance = useMemo(
    () =>
      contas
        .filter((item) => item.status !== "Cancelado")
        .reduce((sum, item) => sum + item.saldoAberto, 0),
    [contas],
  );
  const received = useMemo(
    () => contas.reduce((sum, item) => sum + item.valorRecebido, 0),
    [contas],
  );
  const loadReceivables = async (token: string) => {
    const [accountItems, patientPage, summary] = await Promise.all([
      getContasReceber(token),
      getPacientes(token, { page: 1, pageSize: 100 }),
      getFinanceiroResumo({}, token),
    ]);
    setContas(accountItems);
    setFinanceiroResumo(summary);
    return patientPage.items;
  };
  const reverseReceipt = (id: number, reason: string, token: string) =>
    estornarRecebimento(id, reason, token);
  const registerReceipt = (
    id: number,
    payload: RecebimentoPayload,
    token: string,
  ) => registrarRecebimento(id, payload, token);
  const uploadReceipt = (id: number, file: File, token: string) =>
    uploadComprovanteRecebimento(id, file, token);
  const searchReceivables = (params: FinanceSearchParams, token: string) =>
    searchContasReceber(params, token);
  const loadSummary = (params: FinanceSummaryParams, token: string) =>
    getFinanceiroResumo(params, token);
  const saveReceivable = (
    id: number,
    payload: ContaReceberUpdatePayload,
    token: string,
  ) => updateContaReceber(id, payload, token);
  const cancelReceivable = (
    id: number,
    payload: ContaReceberCancelPayload,
    token: string,
  ) => cancelContaReceber(id, payload, token);
  const downloadReceiptFile = (id: number, token: string) =>
    downloadComprovanteRecebimento(id, token);

  return {
    contas,
    setContas,
    receiptToast,
    setReceiptToast,
    receipt,
    setReceipt,
    reversalTarget,
    setReversalTarget,
    reversalReason,
    setReversalReason,
    financeiroResumo,
    setFinanceiroResumo,
    financePage,
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
