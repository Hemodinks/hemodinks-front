import { useState } from "react";
import type { Faturamento } from "../../types";
import { getAtendimentos, getFaturamentos } from "../../services";
import type {
  AppealDraftState,
  BillingReturnDraft,
  FaturamentoFormState,
  GlosaDraftState,
  RecursoDraftState,
} from "./billingPageTypes";

export function createInitialFaturamentoForm(): FaturamentoFormState {
  return {
    atendimentoCirurgicoId: "",
    competencia: new Date().toISOString().slice(0, 7),
    numeroGuia: "",
    numeroLote: "",
    observacao: "",
  };
}

export function useInvoicing() {
  const [faturamentos, setFaturamentos] = useState<Faturamento[]>([]);
  const [editingBillingId, setEditingBillingId] = useState<number | null>(null);
  const [faturamentoForm, setFaturamentoForm] = useState(
    createInitialFaturamentoForm,
  );
  const [returnTarget, setReturnTarget] = useState<Faturamento | null>(null);
  const [returnDraft, setReturnDraft] = useState<BillingReturnDraft[]>([]);
  const [appealTarget, setAppealTarget] = useState<{
    glosaId: number;
    valorGlosado: number;
  } | null>(null);
  const [appealDraft, setAppealDraft] = useState<AppealDraftState>({
    justificativa: "",
    valorRecuperado: "0",
  });
  const [selectedBilling, setSelectedBilling] = useState<Faturamento | null>(
    null,
  );
  const [billingItemDraft, setBillingItemDraft] = useState<{
    itemId: number;
    codigo: string;
    descricao: string;
    quantidade: string;
    pesoPercentual: string;
    valorUnitario: string;
  } | null>(null);
  const [glosaDraft, setGlosaDraft] = useState<GlosaDraftState | null>(null);
  const [recursoDraft, setRecursoDraft] =
    useState<RecursoDraftState | null>(null);
  const loadInvoicing = async (token: string) => {
    const [atendimentos, items] = await Promise.all([
      getAtendimentos(token),
      getFaturamentos(token),
    ]);
    setFaturamentos(items);
    return atendimentos;
  };

  return {
    faturamentos,
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
  };
}
