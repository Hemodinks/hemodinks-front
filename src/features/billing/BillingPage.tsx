import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import {
  AlertMessage,
  Button,
  ComboboxField,
  DataPanel,
  SelectField,
  TextField,
} from "../../shared/components/ui";
import { Modal } from "../../shared/components/Modal";
import { formatCurrency } from "../../shared/utils/formatters";
import type {
  AtendimentoCirurgico,
  AuthSession,
  ContaReceber,
  Convenio,
  ConvenioProcedimentoPreco,
  Faturamento,
  FinanceiroResumo,
  MedicalUserOption,
  OpmeFornecedor,
  Paciente,
} from "../../types";
import {
  createAtendimento,
  createFaturamento,
  deleteAtendimento,
  deleteFaturamento,
  estornarRecebimento,
  gerarContaReceber,
  getAtendimentos,
  getContasReceber,
  getConvenioProcedimentoPrecos,
  getFaturamentos,
  getHospitais,
  getPacientes,
  registrarRecebimento,
  registrarRecursoGlosa,
  registrarRetornoFaturamento,
  saveConvenioProcedimentoPreco,
  updateFaturamentoStatus,
  updateAtendimento,
  updateFaturamento,
  downloadComprovanteRecebimento,
  getFinanceiroResumo,
  searchContasReceber,
  updateFaturamentoItem,
  uploadComprovanteRecebimento,
  cancelContaReceber,
  deactivateConvenioProcedimentoPreco,
  deleteGlosa,
  deleteRecursoGlosa,
  updateContaReceber,
  updateConvenioProcedimentoPreco,
  updateGlosa,
  updateRecursoGlosa,
} from "../../services";
import { BillingCbhpmLookupModal } from "./BillingCbhpmLookupModal";
import "./billing.css";

type BillingPageProps = {
  session: AuthSession;
  medicalUsers: MedicalUserOption[];
  convenios: Convenio[];
  opmeFornecedores: OpmeFornecedor[];
  isAdmin: boolean;
  isMedical: boolean;
  section?: Tab;
};
type Tab = "atendimentos" | "faturamento" | "financeiro" | "precos";

function createInitialAtendimentoForm(
  medicoResponsavelId = "",
) {
  return {
    pacienteId: "",
    dataProcedimento: "",
    hospitalId: "",
    hospital: "",
    convenioId: "",
    convenio: "",
    opmeFornecedorId: "",
    opmeFornecedor: "",
    medicoResponsavelId,
    medicoAuxiliar1Id: "",
    medicoAuxiliar2Id: "",
    diagnostico: "",
    tratamentoMedico: "",
    cbhpmCodigo: "",
    descricao: "",
    quantidade: "1",
    pesoPercentual: "100",
    numeroAutorizacao: "",
    valorGlosa: "",
    motivoGlosa: "",
    status: "Planejado",
  };
}

function createInitialFaturamentoForm() {
  return {
    atendimentoCirurgicoId: "",
    competencia: new Date().toISOString().slice(0, 7),
    numeroGuia: "",
    numeroLote: "",
    observacao: "",
  };
}

function formatBillingStatus(status: string) {
  return status.replace(/([a-zá-ú])([A-ZÁ-Ú])/g, "$1 $2");
}

type ReceiptFileFormat = "pdf" | "jpg";

function receiptFileMatchesFormat(file: File, format: ReceiptFileFormat) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return format === "pdf"
    ? extension === "pdf" && file.type === "application/pdf"
    : (extension === "jpg" || extension === "jpeg") &&
        file.type === "image/jpeg";
}

function receiptExtensionFromBlob(blob: Blob) {
  if (blob.type === "application/pdf") return "pdf";
  if (blob.type === "image/jpeg") return "jpg";
  throw new Error("O comprovante recebido não possui um formato PDF ou JPG válido.");
}

export function BillingPage({
  session,
  medicalUsers,
  convenios,
  opmeFornecedores,
  isMedical,
  section = "atendimentos",
}: BillingPageProps) {
  const tab = section;
  const [atendimentos, setAtendimentos] = useState<AtendimentoCirurgico[]>([]);
  const [faturamentos, setFaturamentos] = useState<Faturamento[]>([]);
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [precos, setPrecos] = useState<ConvenioProcedimentoPreco[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [hospitais, setHospitais] = useState<
    Array<{ id: number; nome: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    section: Tab;
    message: string;
  } | null>(null);
  const [receiptToast, setReceiptToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAttendanceId, setEditingAttendanceId] = useState<number | null>(
    null,
  );
  const [editingBillingId, setEditingBillingId] = useState<number | null>(null);
  const [atendimentoForm, setAtendimentoForm] = useState(() =>
    createInitialAtendimentoForm(
      isMedical ? String(session.user.id) : "",
    ),
  );
  const [faturamentoForm, setFaturamentoForm] = useState(
    createInitialFaturamentoForm,
  );
  const [procedimentos, setProcedimentos] = useState<
    Array<{
      cbhpmCodigo: string | null;
      descricao: string | null;
      porte?: string | null;
      valorReferencia?: number | null;
      quantidade: number;
      pesoPercentual: number;
    }>
  >([]);
  const [receipt, setReceipt] = useState<{
    contaId: string;
    valor: string;
    forma: string;
    referencia: string;
    comprovanteFormato: ReceiptFileFormat;
    comprovante: File | null;
  }>({
    contaId: "",
    valor: "",
    forma: "Pix",
    referencia: "",
    comprovanteFormato: "pdf",
    comprovante: null,
  });
  const [price, setPrice] = useState({
    convenioId: "",
    cbhpmCodigo: "",
    valorNegociado: "",
    percentualPrincipal: "100",
    percentualAuxiliar1: "0",
    percentualAuxiliar2: "0",
    vigenciaInicio: new Date().toISOString().slice(0, 10),
    vigenciaFinal: "",
  });
  const [returnTarget, setReturnTarget] = useState<Faturamento | null>(null);
  const [returnDraft, setReturnDraft] = useState<
    Array<{
      faturamentoItemId: number;
      descricao: string;
      valorApresentado: number;
      valorGlosado: string;
      motivoGlosa: string;
    }>
  >([]);
  const [appealTarget, setAppealTarget] = useState<{
    glosaId: number;
    valorGlosado: number;
  } | null>(null);
  const [appealDraft, setAppealDraft] = useState({
    justificativa: "",
    valorRecuperado: "0",
  });
  const [reversalTarget, setReversalTarget] = useState<{
    id: number;
    valor: number;
  } | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [financeiroResumo, setFinanceiroResumo] =
    useState<FinanceiroResumo | null>(null);
  const [financePage, setFinancePage] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
  });
  const [financeFilters, setFinanceFilters] = useState({
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
  const [selectedAttendance, setSelectedAttendance] =
    useState<AtendimentoCirurgico | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [cbhpmModalOpen, setCbhpmModalOpen] = useState(false);
  const [glosaDraft, setGlosaDraft] = useState<{
    id: number;
    codigoMotivo: string;
    descricaoMotivo: string;
    valorGlosado: string;
    dataGlosa: string;
    observacao: string;
  } | null>(null);
  const [recursoDraft, setRecursoDraft] = useState<{
    id: number;
    dataEnvio: string;
    justificativa: string;
    valorRecorrido: string;
    dataResposta: string;
    valorRecuperado: string;
    status: string;
    observacao: string;
  } | null>(null);
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
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    action: () => Promise<unknown>;
    success: string;
    after?: () => void;
  } | null>(null);
  const canManageBilling = !isMedical;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      if (tab === "atendimentos") {
        const [items, patientPage, hospitalItems] = await Promise.all([
          getAtendimentos(session.token),
          getPacientes(session.token, { page: 1, pageSize: 100 }),
          getHospitais(session.token),
        ]);
        setAtendimentos(items);
        setPacientes(patientPage.items);
        setHospitais(hospitalItems);
      } else if (tab === "faturamento") {
        const [attendanceItems, billingItems] = await Promise.all([
          getAtendimentos(session.token),
          getFaturamentos(session.token),
        ]);
        setAtendimentos(attendanceItems);
        setFaturamentos(billingItems);
      } else if (tab === "financeiro" && canManageBilling) {
        const [accountItems, patientPage, summary] = await Promise.all([
          getContasReceber(session.token),
          getPacientes(session.token, { page: 1, pageSize: 100 }),
          getFinanceiroResumo({}, session.token),
        ]);
        setContas(accountItems);
        setPacientes(patientPage.items);
        setFinanceiroResumo(summary);
      } else if (tab === "precos") {
        setPrecos(await getConvenioProcedimentoPrecos(session.token));
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar o módulo.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [session.token, tab]);

  useEffect(() => {
    setError("");
    setSuccess(null);
    setReceiptToast(null);
  }, [tab]);

  useEffect(() => {
    if (!success) return;

    const timeoutId = window.setTimeout(() => setSuccess(null), 10000);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  useEffect(() => {
    if (!error) return;

    const timeoutId = window.setTimeout(() => setError(""), 10000);
    return () => window.clearTimeout(timeoutId);
  }, [error]);

  useEffect(() => {
    if (!receiptToast) return;

    const timeoutId = window.setTimeout(() => setReceiptToast(null), 10000);
    return () => window.clearTimeout(timeoutId);
  }, [receiptToast]);

  const openBalance = useMemo(
    () =>
      contas
        .filter((x) => x.status !== "Cancelado")
        .reduce((sum, x) => sum + x.saldoAberto, 0),
    [contas],
  );
  const received = useMemo(
    () => contas.reduce((sum, x) => sum + x.valorRecebido, 0),
    [contas],
  );
  const run = async (
    action: () => Promise<unknown>,
    message: string,
    feedback?: {
      onSuccess?: (successMessage: string) => void;
      onError?: (errorMessage: string) => void;
    },
  ) => {
    const actionSection = tab;
    setLoading(true);
    setError("");
    setSuccess(null);
    try {
      await action();
      setSuccess({ section: actionSection, message });
      feedback?.onSuccess?.(message);
      setShowForm(false);
      await load();
    } catch (reason) {
      const errorMessage =
        reason instanceof Error ? reason.message : "Operação não concluída.";
      setError(errorMessage);
      feedback?.onError?.(errorMessage);
      setLoading(false);
    }
  };

  const submitAtendimento = (event: FormEvent) => {
    event.preventDefault();
    if (!atendimentoForm.pacienteId) {
      setError("Selecione o paciente.");
      return;
    }
    if (!atendimentoForm.dataProcedimento) {
      setError("Informe a data da cirurgia.");
      return;
    }
    if (!atendimentoForm.medicoResponsavelId) {
      setError("Selecione o médico responsável.");
      return;
    }
    const team = [
      atendimentoForm.medicoResponsavelId,
      atendimentoForm.medicoAuxiliar1Id,
      atendimentoForm.medicoAuxiliar2Id,
    ].filter(Boolean);
    if (new Set(team).size !== team.length) {
      setError("O médico responsável e os auxiliares devem ser diferentes.");
      return;
    }
    if (!procedimentos.length) {
      setError("Adicione ao menos um procedimento ao atendimento.");
      return;
    }
    const valorGlosa = atendimentoForm.valorGlosa
      ? Number(atendimentoForm.valorGlosa.replace(",", "."))
      : null;
    if (valorGlosa != null && valorGlosa < 0) {
      setError("O valor da glosa não pode ser negativo.");
      return;
    }
    if (valorGlosa && !atendimentoForm.motivoGlosa.trim()) {
      setError("Informe o motivo da glosa.");
      return;
    }
    const payload = {
      pacienteId: Number(atendimentoForm.pacienteId),
      dataProcedimento: atendimentoForm.dataProcedimento,
      hospitalId: atendimentoForm.hospitalId
        ? Number(atendimentoForm.hospitalId)
        : null,
      hospital: atendimentoForm.hospital.trim() || null,
      convenioId: atendimentoForm.convenioId
        ? Number(atendimentoForm.convenioId)
        : null,
      convenio: atendimentoForm.convenio.trim() || null,
      opmeFornecedorId: atendimentoForm.opmeFornecedorId
        ? Number(atendimentoForm.opmeFornecedorId)
        : null,
      opmeFornecedor: atendimentoForm.opmeFornecedor.trim() || null,
      medicoResponsavelId: Number(atendimentoForm.medicoResponsavelId),
      medicoAuxiliar1Id: atendimentoForm.medicoAuxiliar1Id
        ? Number(atendimentoForm.medicoAuxiliar1Id)
        : null,
      medicoAuxiliar2Id: atendimentoForm.medicoAuxiliar2Id
        ? Number(atendimentoForm.medicoAuxiliar2Id)
        : null,
      diagnostico: atendimentoForm.diagnostico || null,
      tratamentoMedico: atendimentoForm.tratamentoMedico || null,
      numeroAutorizacao: atendimentoForm.numeroAutorizacao || null,
      valorGlosa,
      motivoGlosa: valorGlosa
        ? atendimentoForm.motivoGlosa.trim()
        : null,
      status: atendimentoForm.status,
      procedimentos: procedimentos.map(
        ({ porte, valorReferencia: _, ...procedure }) => ({
          ...procedure,
          cbhpmPorte: porte || null,
        }),
      ),
    };
    void run(
      async () => {
        const atendimento = editingAttendanceId
          ? await updateAtendimento(
              editingAttendanceId,
              payload,
              session.token,
            )
          : await createAtendimento(payload, session.token);
        setAtendimentoForm(
          createInitialAtendimentoForm(
            isMedical ? String(session.user.id) : "",
          ),
        );
        setProcedimentos([]);
        setEditingAttendanceId(null);
        return atendimento;
      },
      editingAttendanceId
        ? "Atendimento atualizado."
        : "Atendimento criado com snapshot de preço.",
    );
  };

  const submitFaturamento = (event: FormEvent) => {
    event.preventDefault();
    const editingBilling = faturamentos.find(
      (item) => item.id === editingBillingId,
    );
    void run(
      async () => {
        const payload = {
          atendimentoCirurgicoId: Number(
            faturamentoForm.atendimentoCirurgicoId,
          ),
          numeroGuia: faturamentoForm.numeroGuia || null,
          numeroLote: faturamentoForm.numeroLote || null,
          competencia: `${faturamentoForm.competencia}-01`,
          observacao: faturamentoForm.observacao || null,
          rowVersion: editingBilling?.rowVersion,
        };
        const faturamento =
          editingBillingId && editingBilling
            ? await updateFaturamento(
                editingBillingId,
                payload,
                session.token,
              )
            : await createFaturamento(payload, session.token);
        setFaturamentoForm(createInitialFaturamentoForm());
        setEditingBillingId(null);
        return faturamento;
      },
      editingBillingId
        ? "Faturamento atualizado."
        : "Faturamento criado a partir do atendimento.",
    );
  };

  const editAttendance = (item: AtendimentoCirurgico) => {
    setEditingAttendanceId(item.id);
    setAtendimentoForm({
      pacienteId: String(item.pacienteId),
      dataProcedimento: item.dataProcedimento.slice(0, 10),
      hospitalId: item.hospitalId ? String(item.hospitalId) : "",
      hospital:
        hospitais.find((hospital) => hospital.id === item.hospitalId)?.nome ??
        "",
      convenioId: item.convenioId ? String(item.convenioId) : "",
      convenio:
        convenios.find((convenio) => convenio.idConvenio === item.convenioId)
          ?.descricaoConvenio ?? "",
      opmeFornecedorId: item.opmeFornecedorId
        ? String(item.opmeFornecedorId)
        : "",
      opmeFornecedor:
        opmeFornecedores.find(
          (fornecedor) => fornecedor.idFornecedor === item.opmeFornecedorId,
        )?.fornecedor ??
        item.opmeFornecedor ??
        "",
      medicoResponsavelId: String(item.medicoResponsavelId),
      medicoAuxiliar1Id: item.medicoAuxiliar1Id
        ? String(item.medicoAuxiliar1Id)
        : "",
      medicoAuxiliar2Id: item.medicoAuxiliar2Id
        ? String(item.medicoAuxiliar2Id)
        : "",
      diagnostico: item.diagnostico ?? "",
      tratamentoMedico: item.tratamentoMedico ?? "",
      cbhpmCodigo: "",
      descricao: "",
      quantidade: "1",
      pesoPercentual: "100",
      numeroAutorizacao: item.numeroAutorizacao ?? "",
      valorGlosa:
        item.valorGlosa != null ? String(item.valorGlosa) : "",
      motivoGlosa: item.motivoGlosa ?? "",
      status: item.status,
    });
    setProcedimentos(
      item.procedimentos.map((procedure) => ({
        cbhpmCodigo: procedure.cbhpmCodigo ?? null,
        descricao: procedure.descricao,
        porte: procedure.cbhpmPorte ?? null,
        valorReferencia: procedure.valorReferencia ?? null,
        quantidade: procedure.quantidade,
        pesoPercentual: procedure.pesoPercentual,
      })),
    );
    setSelectedAttendance(null);
    setShowForm(true);
  };

  const editBilling = (item: Faturamento) => {
    setEditingBillingId(item.id);
    setFaturamentoForm({
      atendimentoCirurgicoId: String(item.atendimentoCirurgicoId),
      competencia: item.competencia.slice(0, 7),
      numeroGuia: item.numeroGuia ?? "",
      numeroLote: item.numeroLote ?? "",
      observacao: item.observacao ?? "",
    });
    setSelectedBilling(null);
    setShowForm(true);
  };

  const createAccount = (item: Faturamento) =>
    void run(
      () =>
        gerarContaReceber(
          item.id,
          {
            faturamentoId: item.id,
            numeroDocumento: `FAT-${item.id}-01`,
            descricao: `Faturamento ${item.numeroGuia || item.id}`,
            dataEmissao: new Date().toISOString(),
            dataVencimento: new Date(Date.now() + 30 * 86400000).toISOString(),
            valorOriginal: null,
            valorAjustado: null,
            observacao: null,
          },
          session.token,
        ),
      "Conta a receber gerada sem duplicidade.",
    );
  const openReturn = (item: Faturamento) => {
    setReturnTarget(item);
    setReturnDraft(
      item.itens.map((billingItem) => ({
        faturamentoItemId: billingItem.id,
        descricao: billingItem.descricao,
        valorApresentado: billingItem.valorApresentado,
        valorGlosado: "0",
        motivoGlosa: "",
      })),
    );
  };
  const submitReturn = (event: FormEvent) => {
    event.preventDefault();
    if (!returnTarget) return;
    const inputs = returnDraft.map((input) => {
      const valorGlosado = Number(input.valorGlosado.replace(",", "."));
      return {
        faturamentoItemId: input.faturamentoItemId,
        valorGlosado,
        valorAprovado: input.valorApresentado - valorGlosado,
        codigoMotivo: null,
        motivoGlosa: valorGlosado > 0 ? input.motivoGlosa : null,
      };
    });
    void run(
      () =>
        registrarRetornoFaturamento(
          returnTarget.id,
          {
            id: returnTarget.id,
            dataRetorno: new Date().toISOString(),
            itens: inputs,
            rowVersion: returnTarget.rowVersion,
          },
          session.token,
        ),
      "Retorno registrado e títulos reconciliados.",
    ).then(() => setReturnTarget(null));
  };
  const submitAppeal = (event: FormEvent) => {
    event.preventDefault();
    if (!appealTarget) return;
    const valorRecuperado = Number(
      appealDraft.valorRecuperado.replace(",", "."),
    );
    void run(
      () =>
        registrarRecursoGlosa(
          appealTarget.glosaId,
          {
            glosaId: appealTarget.glosaId,
            dataEnvio: new Date().toISOString(),
            justificativa: appealDraft.justificativa,
            valorRecorrido: appealTarget.valorGlosado,
            dataResposta: valorRecuperado > 0 ? new Date().toISOString() : null,
            valorRecuperado,
            status:
              valorRecuperado > 0
                ? valorRecuperado === appealTarget.valorGlosado
                  ? "Aceito"
                  : "AceitoParcialmente"
                : "Enviado",
            observacao: null,
          },
          session.token,
        ),
      "Recurso de glosa registrado.",
    ).then(() => setAppealTarget(null));
  };
  const submitReversal = (event: FormEvent) => {
    event.preventDefault();
    if (!reversalTarget) return;
    void run(
      () =>
        estornarRecebimento(reversalTarget.id, reversalReason, session.token),
      "Recebimento estornado e saldo recalculado.",
    ).then(() => {
      setReversalTarget(null);
      setReversalReason("");
    });
  };

  const submitReceipt = async (event: FormEvent) => {
    event.preventDefault();
    setReceiptToast(null);
    const account = contas.find((x) => x.id === Number(receipt.contaId));
    if (!account) return;
    if (
      receipt.comprovante &&
      !receiptFileMatchesFormat(
        receipt.comprovante,
        receipt.comprovanteFormato,
      )
    ) {
      const message = `Selecione um comprovante no formato ${receipt.comprovanteFormato.toUpperCase()}.`;
      setError(message);
      setReceiptToast({ type: "error", message });
      return;
    }
    await run(
      async () => {
        const updated = await registrarRecebimento(
          account.id,
          {
            contaReceberId: account.id,
            dataRecebimento: new Date().toISOString(),
            valorRecebido: Number(receipt.valor.replace(",", ".")),
            formaRecebimento: receipt.forma,
            referenciaBancaria: receipt.referencia || null,
            documentoComprovante: null,
            observacao: null,
            usuarioCadastroId: 0,
            rowVersion: account.rowVersion,
          },
          session.token,
        );
        if (receipt.comprovante) {
          const created = updated.recebimentos.find(
            (x) => !account.recebimentos.some((old) => old.id === x.id),
          );
          if (created)
            await uploadComprovanteRecebimento(
              created.id,
              receipt.comprovante,
              session.token,
            );
        }
      },
      receipt.comprovante
        ? "Recebimento e comprovante registrados."
        : "Recebimento registrado e saldo recalculado.",
      {
        onSuccess: (message) =>
          setReceiptToast({ type: "success", message }),
        onError: (message) => setReceiptToast({ type: "error", message }),
      },
    );
  };
  const submitPrice = (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      id: editingPriceId,
      convenioId: Number(price.convenioId),
      cbhpmCodigo: price.cbhpmCodigo,
      valorNegociado: Number(price.valorNegociado),
      percentualPrincipal: Number(price.percentualPrincipal),
      percentualAuxiliar1: Number(price.percentualAuxiliar1),
      percentualAuxiliar2: Number(price.percentualAuxiliar2),
      vigenciaInicio: price.vigenciaInicio,
      vigenciaFinal: price.vigenciaFinal || null,
      ativo: true,
    };
    void run(
      () =>
        editingPriceId
          ? updateConvenioProcedimentoPreco(
              editingPriceId,
              payload,
              session.token,
            )
          : saveConvenioProcedimentoPreco(payload, session.token),
      editingPriceId
        ? "Preço negociado atualizado."
        : "Preço negociado salvo com vigência.",
    ).then(() => setEditingPriceId(null));
  };
  const saveGlosa = (event: FormEvent) => {
    event.preventDefault();
    if (!glosaDraft) return;
    void run(
      () =>
        updateGlosa(
          glosaDraft.id,
          {
            id: glosaDraft.id,
            codigoMotivo: glosaDraft.codigoMotivo || null,
            descricaoMotivo: glosaDraft.descricaoMotivo,
            valorGlosado: Number(glosaDraft.valorGlosado),
            dataGlosa: glosaDraft.dataGlosa,
            observacao: glosaDraft.observacao || null,
          },
          session.token,
        ),
      "Glosa atualizada e totais recalculados.",
    ).then(() => {
      setGlosaDraft(null);
      setSelectedBilling(null);
    });
  };
  const saveRecurso = (event: FormEvent) => {
    event.preventDefault();
    if (!recursoDraft) return;
    void run(
      () =>
        updateRecursoGlosa(
          recursoDraft.id,
          {
            id: recursoDraft.id,
            dataEnvio: recursoDraft.dataEnvio || null,
            justificativa: recursoDraft.justificativa,
            valorRecorrido: Number(recursoDraft.valorRecorrido),
            dataResposta: recursoDraft.dataResposta || null,
            valorRecuperado: Number(recursoDraft.valorRecuperado),
            status: recursoDraft.status,
            observacao: recursoDraft.observacao || null,
          },
          session.token,
        ),
      "Recurso atualizado e totais recalculados.",
    ).then(() => {
      setRecursoDraft(null);
      setSelectedBilling(null);
    });
  };
  const saveAccount = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAccount || !accountDraft) return;
    void run(
      () =>
        updateContaReceber(
          selectedAccount.id,
          {
            id: selectedAccount.id,
            ...accountDraft,
            valorOriginal: Number(accountDraft.valorOriginal),
            valorAjustado: Number(accountDraft.valorAjustado),
            observacao: accountDraft.observacao || null,
            rowVersion: selectedAccount.rowVersion,
          },
          session.token,
        ),
      "Título atualizado.",
    ).then(() => {
      setAccountDraft(null);
      setSelectedAccount(null);
    });
  };
  const cancelAccount = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAccount) return;
    void run(
      () =>
        cancelContaReceber(
          selectedAccount.id,
          {
            id: selectedAccount.id,
            motivo: cancelReason,
            rowVersion: selectedAccount.rowVersion,
          },
          session.token,
        ),
      "Título cancelado com histórico preservado.",
    ).then(() => {
      setSelectedAccount(null);
      setCancelReason("");
    });
  };
  const applyFinanceFilters = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const competenciaInicio = financeFilters.competencia
        ? `${financeFilters.competencia}-01`
        : undefined;
      const competenciaFim = financeFilters.competencia
        ? new Date(
            Number(financeFilters.competencia.slice(0, 4)),
            Number(financeFilters.competencia.slice(5, 7)),
            0,
          )
            .toISOString()
            .slice(0, 10)
        : undefined;
      const common = {
        inicio: competenciaInicio,
        fim: competenciaFim,
        convenioId: financeFilters.convenioId || undefined,
        medicoId: financeFilters.medicoId || undefined,
        pacienteId: financeFilters.pacienteId || undefined,
      };
      const [paged, resumo] = await Promise.all([
        searchContasReceber(
          {
            page,
            pageSize: 10,
            termo: financeFilters.termo || undefined,
            status: financeFilters.status || undefined,
            vencimentoInicio: financeFilters.vencimentoInicio || undefined,
            vencimentoFim: financeFilters.vencimentoFim || undefined,
            convenioId: financeFilters.convenioId || undefined,
            medicoId: financeFilters.medicoId || undefined,
            pacienteId: financeFilters.pacienteId || undefined,
          },
          session.token,
        ),
        getFinanceiroResumo(common, session.token),
      ]);
      setContas(paged.items);
      setFinancePage({
        page: paged.page,
        totalPages: paged.totalPages,
        totalItems: paged.totalItems,
      });
      setFinanceiroResumo(resumo);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível filtrar o financeiro.",
      );
    } finally {
      setLoading(false);
    }
  };
  const downloadReceipt = async (id: number) => {
    try {
      const blob = await downloadComprovanteRecebimento(id, session.token);
      const extension = receiptExtensionFromBlob(blob);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `comprovante-${id}.${extension}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível baixar o comprovante.",
      );
    }
  };
  const saveBillingItem = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedBilling || !billingItemDraft) return;
    void run(
      () =>
        updateFaturamentoItem(
          selectedBilling.id,
          billingItemDraft.itemId,
          {
            faturamentoId: selectedBilling.id,
            itemId: billingItemDraft.itemId,
            codigo: billingItemDraft.codigo || null,
            descricao: billingItemDraft.descricao,
            quantidade: Number(billingItemDraft.quantidade),
            pesoPercentual: Number(billingItemDraft.pesoPercentual),
            valorUnitario: Number(billingItemDraft.valorUnitario),
            rowVersion: selectedBilling.rowVersion,
          },
          session.token,
        ),
      "Item do rascunho atualizado.",
    ).then(() => {
      setSelectedBilling(null);
      setBillingItemDraft(null);
    });
  };

  return (
    <section className="workspace billing-workspace">
      <DataPanel className="billing-filter-panel">
        <div className="billing-section-heading">
          <div>
            <span className="eyebrow">Módulo</span>
            <h2>
              {tab === "atendimentos"
                ? "Atendimentos cirúrgicos"
                : tab === "faturamento"
                  ? "Faturamento"
                  : tab === "financeiro"
                    ? "Financeiro"
                    : "Tabela de preços"}
            </h2>
          </div>
          <Button onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} /> Atualizar
          </Button>
        </div>
      </DataPanel>
      {error && <AlertMessage type="error">{error}</AlertMessage>}
      {success?.section === tab && (
        <AlertMessage type="success">{success.message}</AlertMessage>
      )}

      {tab === "atendimentos" && (
        <>
          <DataPanel>
            <div className="billing-section-heading">
              <div>
                <span className="eyebrow">Origem clínica</span>
                <h3>Atendimentos cirúrgicos</h3>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  if (editingAttendanceId) {
                    setEditingAttendanceId(null);
                    setAtendimentoForm(
                      createInitialAtendimentoForm(
                        isMedical ? String(session.user.id) : "",
                      ),
                    );
                    setProcedimentos([]);
                    setShowForm(false);
                    return;
                  }
                  setShowForm((current) => !current);
                }}
              >
                {editingAttendanceId ? (
                  "Cancelar edição"
                ) : (
                  <>
                    <Plus size={16} /> Novo atendimento
                  </>
                )}
              </Button>
            </div>
            {showForm && (
              <form
                className="billing-filter-grid billing-attendance-form"
                onSubmit={submitAtendimento}
              >
                <SelectField
                  label="Paciente"
                  value={atendimentoForm.pacienteId}
                  required
                  onChange={(e) =>
                    setAtendimentoForm({
                      ...atendimentoForm,
                      pacienteId: e.target.value,
                    })
                  }
                >
                  <option value="">Selecione</option>
                  {pacientes.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nomePaciente}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  label="Data da cirurgia"
                  type="date"
                  value={atendimentoForm.dataProcedimento}
                  required
                  onValueChange={(v) =>
                    setAtendimentoForm({
                      ...atendimentoForm,
                      dataProcedimento: v,
                    })
                  }
                />
                <ComboboxField
                  label="Hospital"
                  value={atendimentoForm.hospital}
                  options={hospitais.map((item) => item.nome)}
                  placeholder="Não informado"
                  noOptionsLabel="Digite para cadastrar um novo hospital."
                  onValueChange={(value) => {
                    const selected = hospitais.find(
                      (item) =>
                        item.nome.localeCompare(value.trim(), "pt-BR", {
                          sensitivity: "base",
                        }) === 0,
                    );
                    setAtendimentoForm({
                      ...atendimentoForm,
                      hospitalId: selected ? String(selected.id) : "",
                      hospital: value,
                    });
                  }}
                />
                <ComboboxField
                  label="Fornecedor OPME"
                  value={atendimentoForm.opmeFornecedor}
                  options={opmeFornecedores.map((item) => item.fornecedor)}
                  placeholder="Não informado"
                  noOptionsLabel="Digite para cadastrar um novo fornecedor OPME."
                  onValueChange={(value) => {
                    const selected = opmeFornecedores.find(
                      (item) =>
                        item.fornecedor.localeCompare(value.trim(), "pt-BR", {
                          sensitivity: "base",
                        }) === 0,
                    );
                    setAtendimentoForm({
                      ...atendimentoForm,
                      opmeFornecedorId: selected
                        ? String(selected.idFornecedor)
                        : "",
                      opmeFornecedor: value,
                    });
                  }}
                />
                <ComboboxField
                  label="Convênio"
                  value={atendimentoForm.convenio}
                  options={convenios.map((item) => item.descricaoConvenio)}
                  placeholder="Particular"
                  noOptionsLabel="Digite para cadastrar um novo convênio."
                  onValueChange={(value) => {
                    const selected = convenios.find(
                      (item) =>
                        item.descricaoConvenio.localeCompare(
                          value.trim(),
                          "pt-BR",
                          { sensitivity: "base" },
                        ) === 0,
                    );
                    setAtendimentoForm({
                      ...atendimentoForm,
                      convenioId: selected
                        ? String(selected.idConvenio)
                        : "",
                      convenio: value,
                    });
                  }}
                />
                <SelectField
                  label="Médico responsável"
                  value={atendimentoForm.medicoResponsavelId}
                  required
                  disabled={isMedical}
                  onChange={(e) =>
                    setAtendimentoForm({
                      ...atendimentoForm,
                      medicoResponsavelId: e.target.value,
                    })
                  }
                >
                  <option value="">Selecione</option>
                  {medicalUsers.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nome}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Médico auxiliar 1"
                  value={atendimentoForm.medicoAuxiliar1Id}
                  onChange={(e) =>
                    setAtendimentoForm({
                      ...atendimentoForm,
                      medicoAuxiliar1Id: e.target.value,
                    })
                  }
                >
                  <option value="">Não informado</option>
                  {medicalUsers
                    .filter(
                      (x) =>
                        String(x.id) !== atendimentoForm.medicoResponsavelId,
                    )
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nome}
                      </option>
                    ))}
                </SelectField>
                <SelectField
                  label="Médico auxiliar 2"
                  value={atendimentoForm.medicoAuxiliar2Id}
                  onChange={(e) =>
                    setAtendimentoForm({
                      ...atendimentoForm,
                      medicoAuxiliar2Id: e.target.value,
                    })
                  }
                >
                  <option value="">Não informado</option>
                  {medicalUsers
                    .filter(
                      (x) =>
                        String(x.id) !== atendimentoForm.medicoResponsavelId &&
                        String(x.id) !== atendimentoForm.medicoAuxiliar1Id,
                    )
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nome}
                      </option>
                    ))}
                </SelectField>
                <TextField
                  label="Diagnóstico"
                  value={atendimentoForm.diagnostico}
                  onValueChange={(v) =>
                    setAtendimentoForm({ ...atendimentoForm, diagnostico: v })
                  }
                />
                <TextField
                  label="Tratamento médico"
                  value={atendimentoForm.tratamentoMedico}
                  onValueChange={(v) =>
                    setAtendimentoForm({
                      ...atendimentoForm,
                      tratamentoMedico: v,
                    })
                  }
                />
                <div className="billing-attendance-procedures">
                  <span className="billing-attendance-field-label">
                    Procedimento
                  </span>
                  <Button
                    type="button"
                    className="billing-cbhpm-open"
                    onClick={() => setCbhpmModalOpen(true)}
                  >
                    <Search size={17} />
                    Consultar CBHPM
                  </Button>
                  {procedimentos.length ? (
                    <div className="billing-selected-procedures">
                      {procedimentos.map((item, index) => (
                        <article
                          className="billing-selected-procedure"
                          key={`${item.cbhpmCodigo || "manual"}-${index}`}
                        >
                          <div>
                            {item.cbhpmCodigo && (
                              <span className="billing-procedure-code">
                                {item.cbhpmCodigo}
                              </span>
                            )}
                            <strong>{item.descricao}</strong>
                            {item.valorReferencia != null && (
                              <span className="billing-procedure-price">
                                Valor de referência:{" "}
                                {formatCurrency(item.valorReferencia)}
                              </span>
                            )}
                          </div>
                          {item.porte && (
                            <span className="billing-procedure-porte">
                              {item.porte}
                            </span>
                          )}
                          <Button
                            type="button"
                            className="billing-procedure-remove"
                            aria-label={`Remover ${item.descricao || "procedimento"}`}
                            title="Remover procedimento"
                            onClick={() =>
                              setProcedimentos((current) =>
                                current.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              )
                            }
                          >
                            <X size={15} />
                          </Button>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <span className="file-hint">
                      Nenhum procedimento selecionado.
                    </span>
                  )}
                </div>
                <TextField
                  label="Autorização"
                  className="billing-attendance-authorization"
                  value={atendimentoForm.numeroAutorizacao}
                  onValueChange={(v) =>
                    setAtendimentoForm({
                      ...atendimentoForm,
                      numeroAutorizacao: v,
                    })
                  }
                />
                <SelectField
                  label="Status"
                  className="billing-attendance-status"
                  value={atendimentoForm.status}
                  onChange={(event) =>
                    setAtendimentoForm({
                      ...atendimentoForm,
                      status: event.target.value,
                    })
                  }
                >
                  {["Planejado", "Autorizado", "Realizado", "Cancelado"].map(
                    (status) => (
                      <option key={status}>{status}</option>
                    ),
                  )}
                </SelectField>
                <div className="billing-attendance-glosa">
                  <TextField
                    label="Valor da glosa"
                    type="number"
                    min="0"
                    step="0.01"
                    value={atendimentoForm.valorGlosa}
                    onValueChange={(value) =>
                      setAtendimentoForm({
                        ...atendimentoForm,
                        valorGlosa: value,
                      })
                    }
                  />
                  <TextField
                    label="Motivo da glosa"
                    value={atendimentoForm.motivoGlosa}
                    required={Number(atendimentoForm.valorGlosa) > 0}
                    onValueChange={(value) =>
                      setAtendimentoForm({
                        ...atendimentoForm,
                        motivoGlosa: value,
                      })
                    }
                  />
                </div>
                <Button variant="primary" type="submit" disabled={loading}>
                  {editingAttendanceId
                    ? "Atualizar atendimento"
                    : "Salvar atendimento"}
                </Button>
              </form>
            )}
          </DataPanel>
          <DataPanel className="billing-table-panel">
            <div className="table-wrap">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Procedimentos</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {atendimentos.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Button onClick={() => setSelectedAttendance(item)}>
                          {item.paciente}
                        </Button>
                      </td>
                      <td>
                        {new Date(item.dataProcedimento).toLocaleDateString(
                          "pt-BR",
                        )}
                      </td>
                      <td>{item.status}</td>
                      <td>
                        {item.procedimentos
                          .map(
                            (procedure) =>
                              procedure.cbhpmCodigo || procedure.descricao,
                          )
                          .join(", ")}
                      </td>
                      <td>
                        <div className="billing-row-actions">
                          <Button onClick={() => editAttendance(item)}>
                            Editar
                          </Button>
                          <Button
                            className="billing-delete-action"
                            onClick={() =>
                              setConfirmAction({
                                title: "Excluir atendimento",
                                message: `Excluir o atendimento de ${item.paciente}? Esta ação não poderá ser desfeita.`,
                                action: () =>
                                  deleteAtendimento(item.id, session.token),
                                success: "Atendimento excluído.",
                              })
                            }
                          >
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataPanel>
        </>
      )}

      {tab === "faturamento" && (
        <>
          <DataPanel>
            <div className="billing-section-heading">
              <div>
                <span className="eyebrow">Cobrança</span>
                <h3>Faturamentos normalizados</h3>
              </div>
              {canManageBilling && (
                <Button
                  variant="primary"
                  onClick={() => {
                    if (editingBillingId) {
                      setEditingBillingId(null);
                      setFaturamentoForm(createInitialFaturamentoForm());
                      setShowForm(false);
                      return;
                    }
                    setShowForm((current) => !current);
                  }}
                >
                  {editingBillingId ? (
                    "Cancelar edição"
                  ) : (
                    <>
                      <Plus size={16} /> Novo faturamento
                    </>
                  )}
                </Button>
              )}
            </div>
            {showForm && canManageBilling && (
              <form
                className="billing-filter-grid"
                onSubmit={submitFaturamento}
              >
                <SelectField
                  label="Atendimento"
                  value={faturamentoForm.atendimentoCirurgicoId}
                  required
                  disabled={Boolean(editingBillingId)}
                  onChange={(e) =>
                    setFaturamentoForm({
                      ...faturamentoForm,
                      atendimentoCirurgicoId: e.target.value,
                    })
                  }
                >
                  <option value="">Selecione</option>
                  {atendimentos.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.paciente} —{" "}
                      {new Date(x.dataProcedimento).toLocaleDateString("pt-BR")}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  label="Competência"
                  type="month"
                  value={faturamentoForm.competencia}
                  required
                  onValueChange={(v) =>
                    setFaturamentoForm({ ...faturamentoForm, competencia: v })
                  }
                />
                <TextField
                  label="Número da guia"
                  value={faturamentoForm.numeroGuia}
                  onValueChange={(v) =>
                    setFaturamentoForm({ ...faturamentoForm, numeroGuia: v })
                  }
                />
                <TextField
                  label="Número do lote"
                  value={faturamentoForm.numeroLote}
                  onValueChange={(v) =>
                    setFaturamentoForm({ ...faturamentoForm, numeroLote: v })
                  }
                />
                <TextField
                  label="Observação"
                  value={faturamentoForm.observacao}
                  onValueChange={(value) =>
                    setFaturamentoForm({
                      ...faturamentoForm,
                      observacao: value,
                    })
                  }
                />
                <Button variant="primary" type="submit" disabled={loading}>
                  {editingBillingId
                    ? "Atualizar faturamento"
                    : "Gerar itens do faturamento"}
                </Button>
              </form>
            )}
          </DataPanel>
          <DataPanel className="billing-table-panel">
            <div className="table-wrap">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Guia</th>
                    <th>Apresentado</th>
                    <th>Glosa</th>
                    <th>Reconhecido</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {faturamentos.map((x) => (
                    <tr key={x.id}>
                      <td>
                        <Button onClick={() => setSelectedBilling(x)}>
                          {x.paciente}
                        </Button>
                      </td>
                      <td>{x.numeroGuia || "-"}</td>
                      <td>{formatCurrency(x.valorApresentado)}</td>
                      <td>{formatCurrency(x.valorGlosado)}</td>
                      <td>{formatCurrency(x.valorReconhecido)}</td>
                      <td>
                        <span className="status-pill active">
                          {formatBillingStatus(x.status)}
                        </span>
                      </td>
                      <td>
                        <div className="billing-row-actions">
                          {canManageBilling && x.status === "Rascunho" && (
                            <>
                              <Button onClick={() => editBilling(x)}>
                                Editar
                              </Button>
                              <Button
                                className="billing-delete-action"
                                onClick={() =>
                                  setConfirmAction({
                                    title: "Excluir faturamento",
                                    message: `Excluir o faturamento de ${x.paciente}? Os itens em rascunho também serão removidos.`,
                                    action: () =>
                                      deleteFaturamento(x.id, session.token),
                                    success: "Faturamento excluído.",
                                  })
                                }
                              >
                                Excluir
                              </Button>
                              <Button
                                onClick={() =>
                                  void run(
                                    () =>
                                      updateFaturamentoStatus(
                                        x.id,
                                        {
                                          id: x.id,
                                          status: "ProntoParaEnvio",
                                          rowVersion: x.rowVersion,
                                        },
                                        session.token,
                                      ),
                                    "Faturamento pronto para envio.",
                                  )
                                }
                              >
                                Preparar
                              </Button>
                            </>
                          )}
                          {canManageBilling &&
                            x.status === "ProntoParaEnvio" && (
                              <Button
                                variant="primary"
                                onClick={() =>
                                  void run(
                                    () =>
                                      updateFaturamentoStatus(
                                        x.id,
                                        {
                                          id: x.id,
                                          status: "Enviado",
                                          rowVersion: x.rowVersion,
                                        },
                                        session.token,
                                      ),
                                    "Faturamento enviado e data de envio registrada.",
                                  )
                                }
                              >
                                Enviar faturamento
                              </Button>
                            )}
                          {canManageBilling &&
                            [
                              "Enviado",
                              "EmAnalise",
                              "GlosadoParcial",
                              "GlosadoTotal",
                              "Aprovado",
                            ].includes(x.status) && (
                              <Button onClick={() => openReturn(x)}>
                                Registrar retorno
                              </Button>
                            )}
                          {canManageBilling &&
                            x.status !== "Rascunho" &&
                            x.status !== "Cancelado" && (
                              <Button onClick={() => createAccount(x)}>
                                <ArrowRight size={15} /> Gerar título
                              </Button>
                            )}
                          {canManageBilling &&
                            x.glosas.map((g) => (
                            <Button
                              key={g.id}
                              onClick={() => {
                                setAppealTarget({
                                  glosaId: g.id,
                                  valorGlosado: g.valorGlosado,
                                });
                                setAppealDraft({
                                  justificativa: "",
                                  valorRecuperado: "0",
                                });
                              }}
                            >
                              Recorrer glosa {formatCurrency(g.valorGlosado)}
                            </Button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!faturamentos.length && (
                    <tr>
                      <td colSpan={7} className="empty-row">
                        Nenhum faturamento no novo fluxo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DataPanel>
        </>
      )}

      {tab === "financeiro" && canManageBilling && (
        <>
          <section className="billing-summary-grid">
            <Summary
              title="Total previsto"
              value={formatCurrency(financeiroResumo?.valorReconhecido ?? 0)}
            />
            <Summary
              title="Total recebido"
              value={formatCurrency(
                financeiroResumo?.valorRecebido ?? received,
              )}
            />
            <Summary
              title="Saldo em aberto"
              value={formatCurrency(
                financeiroResumo?.saldoAberto ?? openBalance,
              )}
            />
            <Summary
              title="Total vencido"
              value={formatCurrency(financeiroResumo?.valorVencido ?? 0)}
            />
            <Summary
              title="Recebimentos do período"
              value={formatCurrency(financeiroResumo?.recebimentosPeriodo ?? 0)}
            />
          </section>
          <DataPanel>
            <details className="billing-filters-accordion">
              <summary className="billing-filters-summary">
                <div>
                  <span className="eyebrow">Pesquisa</span>
                  <h2>Filtros financeiros</h2>
                </div>
                <span className="billing-filters-toggle">Filtros</span>
              </summary>
              <div className="billing-filters-content">
                <form
                  className="billing-filter-grid"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void applyFinanceFilters(1);
                  }}
                >
                  <TextField
                    label="Buscar por documento ou paciente"
                    placeholder="Ex.: FAT-1-01 ou nome do paciente"
                    value={financeFilters.termo}
                    onValueChange={(value) =>
                      setFinanceFilters({ ...financeFilters, termo: value })
                    }
                  />
              <TextField
                label="Competência"
                type="month"
                value={financeFilters.competencia}
                onValueChange={(value) =>
                  setFinanceFilters({ ...financeFilters, competencia: value })
                }
              />
              <TextField
                label="Vencimento inicial"
                type="date"
                value={financeFilters.vencimentoInicio}
                onValueChange={(value) =>
                  setFinanceFilters({
                    ...financeFilters,
                    vencimentoInicio: value,
                  })
                }
              />
              <TextField
                label="Vencimento final"
                type="date"
                value={financeFilters.vencimentoFim}
                onValueChange={(value) =>
                  setFinanceFilters({ ...financeFilters, vencimentoFim: value })
                }
              />
              <SelectField
                label="Convênio"
                value={financeFilters.convenioId}
                onChange={(event) =>
                  setFinanceFilters({
                    ...financeFilters,
                    convenioId: event.target.value,
                  })
                }
              >
                <option value="">Todos</option>
                {convenios.map((item) => (
                  <option key={item.idConvenio} value={item.idConvenio}>
                    {item.descricaoConvenio}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Médico"
                value={financeFilters.medicoId}
                onChange={(event) =>
                  setFinanceFilters({
                    ...financeFilters,
                    medicoId: event.target.value,
                  })
                }
              >
                <option value="">Todos</option>
                {medicalUsers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Paciente"
                value={financeFilters.pacienteId}
                onChange={(event) =>
                  setFinanceFilters({
                    ...financeFilters,
                    pacienteId: event.target.value,
                  })
                }
              >
                <option value="">Todos</option>
                {pacientes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nomePaciente}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Status"
                value={financeFilters.status}
                onChange={(event) =>
                  setFinanceFilters({
                    ...financeFilters,
                    status: event.target.value,
                  })
                }
              >
                <option value="">Todos</option>
                {[
                  "Previsto",
                  "Aberto",
                  "ParcialmenteRecebido",
                  "Recebido",
                  "Vencido",
                  "Cancelado",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </SelectField>
                  <Button variant="primary" type="submit" disabled={loading}>
                    Aplicar filtros
                  </Button>
                </form>
              </div>
            </details>
          </DataPanel>
          <DataPanel className="billing-finance-receipt-panel">
            <div className="billing-section-heading">
              <div>
                <span className="eyebrow">Financeiro</span>
                <h3>Registrar recebimento</h3>
              </div>
              <Wallet size={20} />
            </div>
            <form className="billing-filter-grid" onSubmit={submitReceipt}>
              <SelectField
                label="Título"
                value={receipt.contaId}
                required
                onChange={(e) =>
                  setReceipt({ ...receipt, contaId: e.target.value })
                }
              >
                <option value="">Selecione</option>
                {contas
                  .filter((x) => x.saldoAberto > 0)
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.numeroDocumento} — {x.paciente} —{" "}
                      {formatCurrency(x.saldoAberto)}
                    </option>
                  ))}
              </SelectField>
              <TextField
                label="Valor recebido"
                type="number"
                min="0.01"
                step="0.01"
                value={receipt.valor}
                required
                onValueChange={(v) => setReceipt({ ...receipt, valor: v })}
              />
              <SelectField
                label="Forma"
                value={receipt.forma}
                onChange={(e) =>
                  setReceipt({ ...receipt, forma: e.target.value })
                }
              >
                {[
                  "Pix",
                  "Transferencia",
                  "Boleto",
                  "Dinheiro",
                  "Cartao",
                  "Deposito",
                  "Outro",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </SelectField>
              <TextField
                label="Referência bancária"
                value={receipt.referencia}
                onValueChange={(v) => setReceipt({ ...receipt, referencia: v })}
              />
              <SelectField
                label="Formato do comprovante"
                value={receipt.comprovanteFormato}
                onChange={(event) =>
                  setReceipt({
                    ...receipt,
                    comprovanteFormato: event.target
                      .value as ReceiptFileFormat,
                    comprovante: null,
                  })
                }
              >
                <option value="pdf">PDF</option>
                <option value="jpg">JPG</option>
              </SelectField>
              <label className="filter-field">
                <span>
                  Comprovante {receipt.comprovanteFormato.toUpperCase()}{" "}
                  (opcional)
                </span>
                <input
                  key={receipt.comprovanteFormato}
                  type="file"
                  accept={
                    receipt.comprovanteFormato === "pdf"
                      ? ".pdf,application/pdf"
                      : ".jpg,.jpeg,image/jpeg"
                  }
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (
                      file &&
                      !receiptFileMatchesFormat(
                        file,
                        receipt.comprovanteFormato,
                      )
                    ) {
                      const message = `Selecione um comprovante no formato ${receipt.comprovanteFormato.toUpperCase()}.`;
                      setError(message);
                      setReceiptToast({ type: "error", message });
                      event.target.value = "";
                      setReceipt({ ...receipt, comprovante: null });
                      return;
                    }
                    setError("");
                    setReceipt({ ...receipt, comprovante: file });
                  }}
                />
              </label>
              <Button variant="primary" type="submit" disabled={loading}>
                Registrar recebimento
              </Button>
              {receiptToast && (
                <div
                  className={`billing-receipt-toast ${receiptToast.type}`}
                  role={receiptToast.type === "error" ? "alert" : "status"}
                  aria-live="polite"
                >
                  {receiptToast.message}
                </div>
              )}
            </form>
          </DataPanel>
          <DataPanel className="billing-table-panel billing-finance-titles-panel">
            <div className="billing-section-heading">
              <div>
                <span className="eyebrow">Financeiro</span>
                <h3>Títulos faturados</h3>
              </div>
            </div>
            <div className="table-wrap">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Paciente</th>
                    <th>Vencimento</th>
                    <th>Original</th>
                    <th>Recebido</th>
                    <th>Saldo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contas.map((x) => (
                    <tr key={x.id}>
                      <td>
                        <Button onClick={() => setSelectedAccount(x)}>
                          {x.numeroDocumento}
                        </Button>
                      </td>
                      <td>{x.paciente}</td>
                      <td>
                        {new Date(x.dataVencimento).toLocaleDateString("pt-BR")}
                        {x.status === "Vencido" && (
                          <span className="status-pill warning">Em atraso</span>
                        )}
                      </td>
                      <td>{formatCurrency(x.valorOriginal)}</td>
                      <td>{formatCurrency(x.valorRecebido)}</td>
                      <td>{formatCurrency(x.saldoAberto)}</td>
                      <td>
                        <span className="status-pill active">
                          {formatBillingStatus(x.status)}
                        </span>
                        {x.recebimentos
                          .filter((r) => !r.estornado)
                          .map((r) => (
                            <Button
                              key={r.id}
                              title={`Estornar ${formatCurrency(r.valorRecebido)}`}
                              onClick={() =>
                                setReversalTarget({
                                  id: r.id,
                                  valor: r.valorRecebido,
                                })
                              }
                            >
                              <RotateCcw size={14} />
                            </Button>
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="billing-filter-actions">
              <Button
                disabled={financePage.page <= 1}
                onClick={() => void applyFinanceFilters(financePage.page - 1)}
              >
                Anterior
              </Button>
              <span>
                {financePage.totalItems} título(s) — página {financePage.page}{" "}
                de {financePage.totalPages}
              </span>
              <Button
                disabled={financePage.page >= financePage.totalPages}
                onClick={() => void applyFinanceFilters(financePage.page + 1)}
              >
                Próxima
              </Button>
            </div>
          </DataPanel>
        </>
      )}
      {tab === "precos" && (
        <>
          {canManageBilling && (
            <DataPanel>
              <div className="billing-section-heading">
                <div>
                  <span className="eyebrow">Contratos</span>
                  <h3>Preço negociado por convênio</h3>
                </div>
              </div>
              <form className="billing-filter-grid" onSubmit={submitPrice}>
                <SelectField
                  label="Convênio"
                  value={price.convenioId}
                  required
                  onChange={(e) =>
                    setPrice({ ...price, convenioId: e.target.value })
                  }
                >
                  <option value="">Selecione</option>
                  {convenios.map((x) => (
                    <option key={x.idConvenio} value={x.idConvenio}>
                      {x.descricaoConvenio}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  label="Código CBHPM"
                  value={price.cbhpmCodigo}
                  required
                  onValueChange={(v) => setPrice({ ...price, cbhpmCodigo: v })}
                />
                <TextField
                  label="Valor negociado"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price.valorNegociado}
                  required
                  onValueChange={(v) =>
                    setPrice({ ...price, valorNegociado: v })
                  }
                />
                <TextField
                  label="Percentual principal"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={price.percentualPrincipal}
                  onValueChange={(v) =>
                    setPrice({ ...price, percentualPrincipal: v })
                  }
                />
                <TextField
                  label="Percentual auxiliar 1"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={price.percentualAuxiliar1}
                  onValueChange={(v) =>
                    setPrice({ ...price, percentualAuxiliar1: v })
                  }
                />
                <TextField
                  label="Percentual auxiliar 2"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={price.percentualAuxiliar2}
                  onValueChange={(v) =>
                    setPrice({ ...price, percentualAuxiliar2: v })
                  }
                />
                <TextField
                  label="Vigência inicial"
                  type="date"
                  value={price.vigenciaInicio}
                  required
                  onValueChange={(v) =>
                    setPrice({ ...price, vigenciaInicio: v })
                  }
                />
                <TextField
                  label="Vigência final"
                  type="date"
                  value={price.vigenciaFinal}
                  onValueChange={(v) =>
                    setPrice({ ...price, vigenciaFinal: v })
                  }
                />
                <Button variant="primary" type="submit" disabled={loading}>
                  {editingPriceId ? "Atualizar preço" : "Salvar preço"}
                </Button>
                {editingPriceId && (
                  <Button type="button" onClick={() => setEditingPriceId(null)}>
                    Cancelar edição
                  </Button>
                )}
              </form>
            </DataPanel>
          )}
          <DataPanel className="billing-table-panel">
            <div className="table-wrap">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Convênio</th>
                    <th>CBHPM</th>
                    <th>Valor</th>
                    <th>Vigência</th>
                    <th>Status / ações</th>
                  </tr>
                </thead>
                <tbody>
                  {precos.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {convenios.find(
                          (convenio) => convenio.idConvenio === item.convenioId,
                        )?.descricaoConvenio || item.convenioId}
                      </td>
                      <td>{item.cbhpmCodigo}</td>
                      <td>{formatCurrency(item.valorNegociado)}</td>
                      <td>
                        {new Date(item.vigenciaInicio).toLocaleDateString(
                          "pt-BR",
                        )}{" "}
                        —{" "}
                        {item.vigenciaFinal
                          ? new Date(item.vigenciaFinal).toLocaleDateString(
                              "pt-BR",
                            )
                          : "sem término"}
                      </td>
                      <td>
                        <span className="status-pill active">
                          {item.ativo ? "Ativo" : "Inativo"}
                        </span>
                        {canManageBilling && (
                          <Button
                            onClick={() => {
                              setEditingPriceId(item.id);
                              setPrice({
                                convenioId: String(item.convenioId),
                                cbhpmCodigo: item.cbhpmCodigo,
                                valorNegociado: String(item.valorNegociado),
                                percentualPrincipal: String(
                                  item.percentualPrincipal,
                                ),
                                percentualAuxiliar1: String(
                                  item.percentualAuxiliar1,
                                ),
                                percentualAuxiliar2: String(
                                  item.percentualAuxiliar2,
                                ),
                                vigenciaInicio: item.vigenciaInicio.slice(
                                  0,
                                  10,
                                ),
                                vigenciaFinal:
                                  item.vigenciaFinal?.slice(0, 10) || "",
                              });
                            }}
                          >
                            Editar
                          </Button>
                        )}
                        {canManageBilling && item.ativo && (
                          <Button
                            onClick={() =>
                              setConfirmAction({
                                title: "Desativar preço",
                                message: `Desativar o preço ${item.cbhpmCodigo}? O histórico será preservado.`,
                                action: () =>
                                  deactivateConvenioProcedimentoPreco(
                                    item.id,
                                    session.token,
                                  ),
                                success: "Preço desativado.",
                              })
                            }
                          >
                            Desativar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!precos.length && (
                    <tr>
                      <td colSpan={5} className="empty-row">
                        Nenhum preço cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DataPanel>
        </>
      )}
      {returnTarget && (
        <Modal
          titleId="billing-return-title"
          className="billing-wide-modal billing-return-modal"
          onClose={() => setReturnTarget(null)}
        >
          <div className="panel-title">
            <div>
              <span className="eyebrow">Retorno do convênio</span>
              <h2 id="billing-return-title">Registrar retorno do faturamento</h2>
              <p className="billing-modal-subtitle">
                Informe a glosa de cada procedimento apresentado.
              </p>
            </div>
            <Button onClick={() => setReturnTarget(null)}>
              <X size={16} />
            </Button>
          </div>
          <form className="billing-return-form" onSubmit={submitReturn}>
            <div className="billing-return-list">
              {returnDraft.map((item, index) => {
                const hasGlosa =
                  Number(item.valorGlosado.replace(",", ".")) > 0;
                return (
                  <article
                    className="billing-return-item"
                    key={item.faturamentoItemId}
                  >
                    <div className="billing-return-description">
                      <span>Procedimento {index + 1}</span>
                      <strong>{item.descricao}</strong>
                      <small>
                        Apresentado: {formatCurrency(item.valorApresentado)}
                      </small>
                    </div>
                    <TextField
                      label="Valor da glosa"
                      type="number"
                      min="0"
                      max={item.valorApresentado}
                      step="0.01"
                      value={item.valorGlosado}
                      required
                      onValueChange={(value) =>
                        setReturnDraft((current) =>
                          current.map((draft, position) =>
                            position === index
                              ? { ...draft, valorGlosado: value }
                              : draft,
                          ),
                        )
                      }
                    />
                    {hasGlosa ? (
                      <TextField
                        label="Motivo da glosa"
                        value={item.motivoGlosa}
                        required
                        onValueChange={(value) =>
                          setReturnDraft((current) =>
                            current.map((draft, position) =>
                              position === index
                                ? { ...draft, motivoGlosa: value }
                                : draft,
                            ),
                          )
                        }
                      />
                    ) : (
                      <span className="billing-return-no-glosa">
                        Sem glosa para este procedimento
                      </span>
                    )}
                  </article>
                );
              })}
            </div>
            <div className="billing-return-actions">
              <Button onClick={() => setReturnTarget(null)}>Cancelar</Button>
              <Button variant="primary" type="submit" disabled={loading}>
                Confirmar retorno
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {appealTarget && (
        <Modal
          titleId="billing-appeal-title"
          onClose={() => setAppealTarget(null)}
        >
          <div className="panel-title">
            <h2 id="billing-appeal-title">Recurso de glosa</h2>
            <Button onClick={() => setAppealTarget(null)}>
              <X size={16} />
            </Button>
          </div>
          <form className="billing-filter-grid" onSubmit={submitAppeal}>
            <TextField
              label="Justificativa"
              value={appealDraft.justificativa}
              required
              onValueChange={(value) =>
                setAppealDraft({ ...appealDraft, justificativa: value })
              }
            />
            <TextField
              label="Valor recuperado"
              type="number"
              min="0"
              max={appealTarget.valorGlosado}
              step="0.01"
              value={appealDraft.valorRecuperado}
              required
              onValueChange={(value) =>
                setAppealDraft({ ...appealDraft, valorRecuperado: value })
              }
            />
            <span className="file-hint">
              Use zero enquanto o recurso aguarda resposta.
            </span>
            <Button variant="primary" type="submit" disabled={loading}>
              Registrar recurso
            </Button>
          </form>
        </Modal>
      )}
      {reversalTarget && (
        <Modal
          titleId="billing-reversal-title"
          className="billing-reversal-modal"
          onClose={() => {
            setReversalTarget(null);
            setReversalReason("");
          }}
        >
          <div className="panel-title">
            <div>
              <span className="eyebrow">Estorno de recebimento</span>
              <h2 id="billing-reversal-title">Confirmar estorno</h2>
              <p className="billing-modal-subtitle">
                Valor selecionado:{" "}
                <strong>{formatCurrency(reversalTarget.valor)}</strong>
              </p>
            </div>
            <Button
              aria-label="Fechar estorno"
              onClick={() => {
                setReversalTarget(null);
                setReversalReason("");
              }}
            >
              <X size={16} />
            </Button>
          </div>
          <form className="billing-reversal-form" onSubmit={submitReversal}>
            <p className="billing-reversal-notice">
              O recebimento será marcado como estornado e o saldo do título
              será recalculado automaticamente.
            </p>
            <TextField
              label="Motivo do estorno"
              value={reversalReason}
              required
              onValueChange={setReversalReason}
            />
            <div className="billing-reversal-actions">
              <Button
                type="button"
                onClick={() => {
                  setReversalTarget(null);
                  setReversalReason("");
                }}
              >
                Voltar
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                Confirmar estorno
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {selectedAccount && (
        <Modal
          titleId="billing-account-title"
          className="billing-wide-modal billing-account-detail-modal"
          backdropClassName="billing-account-detail-backdrop"
          onClose={() => {
            setSelectedAccount(null);
            setAccountDraft(null);
            setCancelReason("");
          }}
        >
          <div className="panel-title">
            <div>
              <span className="eyebrow">Detalhe da conta</span>
              <h2 id="billing-account-title">
                {selectedAccount.numeroDocumento}
              </h2>
            </div>
            <Button onClick={() => setSelectedAccount(null)}>
              <X size={16} />
            </Button>
          </div>
          <section className="billing-summary-grid">
            <Summary
              title="Valor ajustado"
              value={formatCurrency(selectedAccount.valorAjustado)}
            />
            <Summary
              title="Recebido"
              value={formatCurrency(selectedAccount.valorRecebido)}
            />
            <Summary
              title="Saldo atualizado"
              value={formatCurrency(selectedAccount.saldoAberto)}
            />
          </section>
          <div className="billing-filter-actions">
            {selectedAccount.recebimentos.every((item) => item.estornado) &&
              selectedAccount.status !== "Cancelado" && (
                <Button
                  onClick={() =>
                    setAccountDraft({
                      numeroDocumento: selectedAccount.numeroDocumento,
                      descricao: selectedAccount.descricao,
                      dataEmissao: selectedAccount.dataEmissao.slice(0, 10),
                      dataVencimento: selectedAccount.dataVencimento.slice(
                        0,
                        10,
                      ),
                      valorOriginal: String(selectedAccount.valorOriginal),
                      valorAjustado: String(selectedAccount.valorAjustado),
                      observacao: selectedAccount.observacao || "",
                    })
                  }
                >
                  Editar título
                </Button>
              )}
            {selectedAccount.status !== "Cancelado" && (
              <Button onClick={() => setCancelReason(" ")}>
                Cancelar título
              </Button>
            )}
          </div>
          {accountDraft && (
            <form className="billing-filter-grid" onSubmit={saveAccount}>
              <TextField
                label="Documento"
                value={accountDraft.numeroDocumento}
                required
                onValueChange={(value) =>
                  setAccountDraft({ ...accountDraft, numeroDocumento: value })
                }
              />
              <TextField
                label="Descrição"
                value={accountDraft.descricao}
                required
                onValueChange={(value) =>
                  setAccountDraft({ ...accountDraft, descricao: value })
                }
              />
              <TextField
                label="Emissão"
                type="date"
                value={accountDraft.dataEmissao}
                required
                onValueChange={(value) =>
                  setAccountDraft({ ...accountDraft, dataEmissao: value })
                }
              />
              <TextField
                label="Vencimento"
                type="date"
                value={accountDraft.dataVencimento}
                required
                onValueChange={(value) =>
                  setAccountDraft({ ...accountDraft, dataVencimento: value })
                }
              />
              <TextField
                label="Valor original"
                type="number"
                min="0"
                step="0.01"
                value={accountDraft.valorOriginal}
                required
                onValueChange={(value) =>
                  setAccountDraft({ ...accountDraft, valorOriginal: value })
                }
              />
              <TextField
                label="Valor ajustado"
                type="number"
                min="0"
                step="0.01"
                value={accountDraft.valorAjustado}
                required
                onValueChange={(value) =>
                  setAccountDraft({ ...accountDraft, valorAjustado: value })
                }
              />
              <TextField
                label="Observação"
                value={accountDraft.observacao}
                onValueChange={(value) =>
                  setAccountDraft({ ...accountDraft, observacao: value })
                }
              />
              <Button variant="primary" type="submit">
                Salvar título
              </Button>
            </form>
          )}
          {cancelReason && (
            <form className="billing-filter-grid" onSubmit={cancelAccount}>
              <TextField
                label="Motivo do cancelamento"
                value={cancelReason.trimStart()}
                required
                onValueChange={setCancelReason}
              />
              <Button variant="primary" type="submit">
                Confirmar cancelamento
              </Button>
            </form>
          )}
          <h3>Histórico de recebimentos</h3>
          <div className="table-wrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Forma</th>
                  <th>Valor</th>
                  <th>Situação</th>
                  <th>Comprovante</th>
                </tr>
              </thead>
              <tbody>
                {selectedAccount.recebimentos.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {new Date(item.dataRecebimento).toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>
                    <td>{item.formaRecebimento}</td>
                    <td>{formatCurrency(item.valorRecebido)}</td>
                    <td>
                      {item.estornado
                        ? `Estornado — ${item.motivoEstorno || ""}`
                        : "Ativo"}
                    </td>
                    <td>
                      {item.documentoComprovante ? (
                        <Button onClick={() => void downloadReceipt(item.id)}>
                          Baixar
                        </Button>
                      ) : (
                        "Não anexado"
                      )}
                    </td>
                  </tr>
                ))}
                {!selectedAccount.recebimentos.length && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      Nenhum recebimento lançado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
      {selectedBilling && (
        <Modal
          titleId="billing-detail-title"
          className="billing-wide-modal billing-invoice-detail-modal"
          onClose={() => {
            setSelectedBilling(null);
            setBillingItemDraft(null);
          }}
        >
          <div className="panel-title">
            <div>
              <span className="eyebrow">Detalhe do faturamento</span>
              <h2 id="billing-detail-title">
                {selectedBilling.paciente} —{" "}
                {selectedBilling.numeroGuia || `#${selectedBilling.id}`}
              </h2>
            </div>
            <div className="billing-modal-actions">
              {canManageBilling && selectedBilling.status === "Rascunho" && (
                <>
                  <Button onClick={() => editBilling(selectedBilling)}>
                    Editar faturamento
                  </Button>
                  <Button
                    className="billing-delete-action"
                    onClick={() => {
                      const item = selectedBilling;
                      setConfirmAction({
                        title: "Excluir faturamento",
                        message: `Excluir o faturamento de ${item.paciente}? Os itens em rascunho também serão removidos.`,
                        action: () =>
                          deleteFaturamento(item.id, session.token),
                        success: "Faturamento excluído.",
                        after: () => setSelectedBilling(null),
                      });
                    }}
                  >
                    Excluir
                  </Button>
                </>
              )}
              <Button onClick={() => setSelectedBilling(null)}>
                <X size={16} />
              </Button>
            </div>
          </div>
          <section className="billing-summary-grid">
            <Summary
              title="Apresentado"
              value={formatCurrency(selectedBilling.valorApresentado)}
            />
            <Summary
              title="Glosado"
              value={formatCurrency(selectedBilling.valorGlosado)}
            />
            <Summary
              title="Recuperado"
              value={formatCurrency(selectedBilling.valorGlosaRecuperada)}
            />
            <Summary
              title="Reconhecido"
              value={formatCurrency(selectedBilling.valorReconhecido)}
            />
          </section>
          <h3>Itens</h3>
          <div className="table-wrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Quantidade</th>
                  <th>Peso</th>
                  <th>Unitário</th>
                  <th>Apresentado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {selectedBilling.itens.map((item) => (
                  <tr key={item.id}>
                    <td>{item.codigo || "-"}</td>
                    <td>{item.descricao}</td>
                    <td>{item.quantidade}</td>
                    <td>{item.pesoPercentual}%</td>
                    <td>{formatCurrency(item.valorUnitario)}</td>
                    <td>{formatCurrency(item.valorApresentado)}</td>
                    <td>
                      {selectedBilling.status === "Rascunho" &&
                        canManageBilling && (
                          <Button
                            onClick={() =>
                              setBillingItemDraft({
                                itemId: item.id,
                                codigo: item.codigo || "",
                                descricao: item.descricao,
                                quantidade: String(item.quantidade),
                                pesoPercentual: String(item.pesoPercentual),
                                valorUnitario: String(item.valorUnitario),
                              })
                            }
                          >
                            Editar
                          </Button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {billingItemDraft && (
            <form className="billing-filter-grid" onSubmit={saveBillingItem}>
              <TextField
                label="Código"
                value={billingItemDraft.codigo}
                onValueChange={(value) =>
                  setBillingItemDraft({ ...billingItemDraft, codigo: value })
                }
              />
              <TextField
                label="Descrição"
                value={billingItemDraft.descricao}
                required
                onValueChange={(value) =>
                  setBillingItemDraft({ ...billingItemDraft, descricao: value })
                }
              />
              <TextField
                label="Quantidade"
                type="number"
                min="0.0001"
                step="0.0001"
                value={billingItemDraft.quantidade}
                required
                onValueChange={(value) =>
                  setBillingItemDraft({
                    ...billingItemDraft,
                    quantidade: value,
                  })
                }
              />
              <TextField
                label="Peso percentual"
                type="number"
                min="0"
                step="0.0001"
                value={billingItemDraft.pesoPercentual}
                required
                onValueChange={(value) =>
                  setBillingItemDraft({
                    ...billingItemDraft,
                    pesoPercentual: value,
                  })
                }
              />
              <TextField
                label="Valor unitário"
                type="number"
                min="0"
                step="0.01"
                value={billingItemDraft.valorUnitario}
                required
                onValueChange={(value) =>
                  setBillingItemDraft({
                    ...billingItemDraft,
                    valorUnitario: value,
                  })
                }
              />
              <Button variant="primary" type="submit">
                Salvar item
              </Button>
            </form>
          )}
          <h3>Glosas e recursos</h3>
          {selectedBilling.glosas.map((glosa) => (
            <DataPanel key={glosa.id}>
              <strong>
                {glosa.descricaoMotivo} — {formatCurrency(glosa.valorGlosado)}
              </strong>
              {canManageBilling && (
                <div className="billing-filter-actions">
                  <Button
                    onClick={() =>
                      setGlosaDraft({
                        id: glosa.id,
                        codigoMotivo: glosa.codigoMotivo || "",
                        descricaoMotivo: glosa.descricaoMotivo,
                        valorGlosado: String(glosa.valorGlosado),
                        dataGlosa: glosa.dataGlosa.slice(0, 10),
                        observacao: glosa.observacao || "",
                      })
                    }
                  >
                    Editar glosa
                  </Button>
                  {!glosa.recursos.length && (
                    <Button
                      onClick={() =>
                        setConfirmAction({
                          title: "Excluir glosa",
                          message:
                            "Excluir esta glosa e recalcular os totais do faturamento?",
                          action: () => deleteGlosa(glosa.id, session.token),
                          success: "Glosa excluída.",
                          after: () => setSelectedBilling(null),
                        })
                      }
                    >
                      Excluir glosa
                    </Button>
                  )}
                </div>
              )}
              {glosa.recursos.map((recurso) => (
                <div key={recurso.id}>
                  <p>
                    {recurso.status}: {recurso.justificativa} — recuperado{" "}
                    {formatCurrency(recurso.valorRecuperado)}
                  </p>
                  {canManageBilling && (
                    <div className="billing-filter-actions">
                      <Button
                        onClick={() =>
                          setRecursoDraft({
                            id: recurso.id,
                            dataEnvio: recurso.dataEnvio?.slice(0, 10) || "",
                            justificativa: recurso.justificativa,
                            valorRecorrido: String(recurso.valorRecorrido),
                            dataResposta:
                              recurso.dataResposta?.slice(0, 10) || "",
                            valorRecuperado: String(recurso.valorRecuperado),
                            status: recurso.status,
                            observacao: recurso.observacao || "",
                          })
                        }
                      >
                        Editar recurso
                      </Button>
                      {recurso.status === "EmPreparacao" && (
                        <Button
                          onClick={() =>
                            setConfirmAction({
                              title: "Excluir recurso",
                              message:
                                "Excluir este recurso ainda em preparação?",
                              action: () =>
                                deleteRecursoGlosa(recurso.id, session.token),
                              success: "Recurso excluído.",
                              after: () => setSelectedBilling(null),
                            })
                          }
                        >
                          Excluir recurso
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </DataPanel>
          ))}
          {!selectedBilling.glosas.length && (
            <p className="empty-row">Nenhuma glosa registrada.</p>
          )}
        </Modal>
      )}
      {glosaDraft && (
        <Modal titleId="glosa-edit-title" onClose={() => setGlosaDraft(null)}>
          <div className="panel-title">
            <h2 id="glosa-edit-title">Editar glosa</h2>
            <Button onClick={() => setGlosaDraft(null)}>
              <X size={16} />
            </Button>
          </div>
          <form className="billing-filter-grid" onSubmit={saveGlosa}>
            <TextField
              label="Código do motivo"
              value={glosaDraft.codigoMotivo}
              onValueChange={(value) =>
                setGlosaDraft({ ...glosaDraft, codigoMotivo: value })
              }
            />
            <TextField
              label="Descrição do motivo"
              value={glosaDraft.descricaoMotivo}
              required
              onValueChange={(value) =>
                setGlosaDraft({ ...glosaDraft, descricaoMotivo: value })
              }
            />
            <TextField
              label="Valor glosado"
              type="number"
              min="0"
              step="0.01"
              value={glosaDraft.valorGlosado}
              required
              onValueChange={(value) =>
                setGlosaDraft({ ...glosaDraft, valorGlosado: value })
              }
            />
            <TextField
              label="Data da glosa"
              type="date"
              value={glosaDraft.dataGlosa}
              required
              onValueChange={(value) =>
                setGlosaDraft({ ...glosaDraft, dataGlosa: value })
              }
            />
            <TextField
              label="Observação"
              value={glosaDraft.observacao}
              onValueChange={(value) =>
                setGlosaDraft({ ...glosaDraft, observacao: value })
              }
            />
            <Button variant="primary" type="submit">
              Salvar glosa
            </Button>
          </form>
        </Modal>
      )}
      {recursoDraft && (
        <Modal
          titleId="recurso-edit-title"
          onClose={() => setRecursoDraft(null)}
        >
          <div className="panel-title">
            <h2 id="recurso-edit-title">Editar recurso de glosa</h2>
            <Button onClick={() => setRecursoDraft(null)}>
              <X size={16} />
            </Button>
          </div>
          <form className="billing-filter-grid" onSubmit={saveRecurso}>
            <TextField
              label="Data de envio"
              type="date"
              value={recursoDraft.dataEnvio}
              onValueChange={(value) =>
                setRecursoDraft({ ...recursoDraft, dataEnvio: value })
              }
            />
            <TextField
              label="Justificativa"
              value={recursoDraft.justificativa}
              required
              onValueChange={(value) =>
                setRecursoDraft({ ...recursoDraft, justificativa: value })
              }
            />
            <TextField
              label="Valor recorrido"
              type="number"
              min="0"
              step="0.01"
              value={recursoDraft.valorRecorrido}
              required
              onValueChange={(value) =>
                setRecursoDraft({ ...recursoDraft, valorRecorrido: value })
              }
            />
            <TextField
              label="Data da resposta"
              type="date"
              value={recursoDraft.dataResposta}
              onValueChange={(value) =>
                setRecursoDraft({ ...recursoDraft, dataResposta: value })
              }
            />
            <TextField
              label="Valor recuperado"
              type="number"
              min="0"
              step="0.01"
              value={recursoDraft.valorRecuperado}
              required
              onValueChange={(value) =>
                setRecursoDraft({ ...recursoDraft, valorRecuperado: value })
              }
            />
            <SelectField
              label="Status"
              value={recursoDraft.status}
              onChange={(event) =>
                setRecursoDraft({ ...recursoDraft, status: event.target.value })
              }
            >
              {[
                "EmPreparacao",
                "Enviado",
                "Aceito",
                "AceitoParcialmente",
                "Negado",
                "Cancelado",
              ].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </SelectField>
            <TextField
              label="Observação"
              value={recursoDraft.observacao}
              onValueChange={(value) =>
                setRecursoDraft({ ...recursoDraft, observacao: value })
              }
            />
            <Button variant="primary" type="submit">
              Salvar recurso
            </Button>
          </form>
        </Modal>
      )}
      {confirmAction && (
        <Modal
          titleId="confirm-finance-action"
          onClose={() => setConfirmAction(null)}
        >
          <div className="panel-title">
            <h2 id="confirm-finance-action">{confirmAction.title}</h2>
            <Button onClick={() => setConfirmAction(null)}>
              <X size={16} />
            </Button>
          </div>
          <p>{confirmAction.message}</p>
          <div className="billing-filter-actions">
            <Button onClick={() => setConfirmAction(null)}>Voltar</Button>
            <Button
              variant="primary"
              disabled={loading}
              onClick={() => {
                const pending = confirmAction;
                void run(pending.action, pending.success).then(() => {
                  pending.after?.();
                  setConfirmAction(null);
                });
              }}
            >
              Confirmar
            </Button>
          </div>
        </Modal>
      )}
      {selectedAttendance && (
        <Modal
          titleId="attendance-detail-title"
          className="billing-attendance-detail-modal"
          onClose={() => setSelectedAttendance(null)}
        >
          <div className="panel-title">
            <div>
              <span className="eyebrow">Atendimento cirúrgico</span>
              <h2 id="attendance-detail-title">
                {selectedAttendance.paciente}
              </h2>
            </div>
            <div className="billing-modal-actions">
              <Button onClick={() => editAttendance(selectedAttendance)}>
                Editar atendimento
              </Button>
              <Button
                className="billing-delete-action"
                onClick={() => {
                  const item = selectedAttendance;
                  setConfirmAction({
                    title: "Excluir atendimento",
                    message: `Excluir o atendimento de ${item.paciente}? Esta ação não poderá ser desfeita.`,
                    action: () => deleteAtendimento(item.id, session.token),
                    success: "Atendimento excluído.",
                    after: () => setSelectedAttendance(null),
                  });
                }}
              >
                Excluir
              </Button>
              <Button onClick={() => setSelectedAttendance(null)}>
                <X size={16} />
              </Button>
            </div>
          </div>
          <section className="billing-summary-grid">
            <Summary
              title="Data"
              value={new Date(
                selectedAttendance.dataProcedimento,
              ).toLocaleDateString("pt-BR")}
            />
            <Summary title="Status" value={selectedAttendance.status} />
            <Summary
              title="Autorização"
              value={selectedAttendance.numeroAutorizacao || "Não informada"}
            />
            <Summary
              title="Glosa"
              value={
                selectedAttendance.valorGlosa
                  ? `${formatCurrency(selectedAttendance.valorGlosa)} — ${selectedAttendance.motivoGlosa}`
                  : "Não informada"
              }
            />
          </section>
          <div className="table-wrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>CBHPM</th>
                  <th>Procedimento</th>
                  <th>Quantidade</th>
                  <th>Peso</th>
                  <th>Referência</th>
                  <th>Negociado</th>
                </tr>
              </thead>
              <tbody>
                {selectedAttendance.procedimentos.map((item) => (
                  <tr key={item.id}>
                    <td>{item.cbhpmCodigo || "-"}</td>
                    <td>{item.descricao}</td>
                    <td>{item.quantidade}</td>
                    <td>{item.pesoPercentual}%</td>
                    <td>
                      {item.valorReferencia == null
                        ? "-"
                        : formatCurrency(item.valorReferencia)}
                    </td>
                    <td>
                      {item.valorNegociado == null
                        ? "-"
                        : formatCurrency(item.valorNegociado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="file-hint">
            Os valores exibidos são o snapshot preservado na data do
            atendimento.
          </p>
        </Modal>
      )}
      {cbhpmModalOpen && (
        <BillingCbhpmLookupModal
          token={session.token}
          onClose={() => setCbhpmModalOpen(false)}
          onSelect={(item) => {
            setProcedimentos((current) => {
              const alreadyAdded = current.some(
                (procedure) =>
                  procedure.cbhpmCodigo === (item.codigo || null) &&
                  procedure.descricao === item.procedimento,
              );
              if (alreadyAdded) return current;

              return [
                ...current,
                {
                  cbhpmCodigo: item.codigo || null,
                  descricao: item.procedimento,
                  porte: item.porte,
                  valorReferencia: item.valorReferencia,
                  quantidade: 1,
                  pesoPercentual: 100,
                },
              ];
            });
            setCbhpmModalOpen(false);
          }}
        />
      )}
    </section>
  );
}

function Summary({ title, value }: { title: string; value: string }) {
  return (
    <DataPanel>
      <span>{title}</span>
      <h3>{value}</h3>
    </DataPanel>
  );
}
function RecordTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string>>;
}) {
  return (
    <DataPanel className="billing-table-panel">
      <div className="table-wrap">
        <table className="billing-table">
          <thead>
            <tr>
              {headers.map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={headers.length} className="empty-row">
                  Nenhum registro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DataPanel>
  );
}
