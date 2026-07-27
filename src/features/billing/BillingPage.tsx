import { type FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  SlidersHorizontal,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  AlertMessage,
  Button,
  DataPanel,
  IconButton,
  SelectField,
  TextField,
  TextareaField,
} from "../../shared/components/ui";
import { Modal } from "../../shared/components/Modal";
import { ConfirmationDialog } from "../../shared/components/ConfirmationDialog";
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
import { AttendanceSection } from "./AttendanceSection";
import { InvoicingSection } from "./InvoicingSection";
import { FinanceSection } from "./FinanceSection";
import { PricesSection } from "./PricesSection";
import {
  BillingAppealModal,
  BillingReturnModal,
  BillingReversalModal,
} from "./BillingWorkflowModals";
import { AttendanceDetailsModal } from "./AttendanceDetailsModal";
import { GlosaEditModal, RecursoEditModal } from "./BillingEditModals";
import {
  createInitialAtendimentoForm,
  useAttendances,
} from "./useAttendances";
import {
  createInitialFaturamentoForm,
  useInvoicing,
} from "./useInvoicing";
import { useReceivables } from "./useReceivables";
import {
  createInitialPriceForm,
  useProcedurePrices,
} from "./useProcedurePrices";
import {
  downloadGeneratedReceipt,
  type GeneratedReceiptFormat,
} from "./receiptDocument";
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

function formatBillingStatus(status: string) {
  return status.replace(/([a-zá-ú])([A-ZÁ-Ú])/g, "$1 $2");
}

function isSupportedReceiptFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return (
    (extension === "pdf" && file.type === "application/pdf") ||
    ((extension === "jpg" || extension === "jpeg") &&
      file.type === "image/jpeg")
  );
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
  const {
    atendimentos,
    setAtendimentos,
    pacientes,
    setPacientes,
    hospitais,
    setHospitais,
    showForm,
    setShowForm,
    editingAttendanceId,
    setEditingAttendanceId,
    atendimentoForm,
    setAtendimentoForm,
    procedimentos,
    setProcedimentos,
    selectedAttendance,
    setSelectedAttendance,
    cbhpmModalOpen,
    setCbhpmModalOpen,
    loadAttendances,
  } = useAttendances(isMedical ? String(session.user.id) : "");
  const {
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
  } = useInvoicing();
  const {
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
  } = useReceivables();
  const {
    precos,
    setPrecos,
    price,
    setPrice,
    editingPriceId,
    setEditingPriceId,
    loadProcedurePrices,
  } = useProcedurePrices();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    section: Tab;
    message: string;
  } | null>(null);
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
        await loadAttendances(session.token);
      } else if (tab === "faturamento") {
        setAtendimentos(await loadInvoicing(session.token));
      } else if (tab === "financeiro" && canManageBilling) {
        setPacientes(await loadReceivables(session.token));
      } else if (tab === "precos") {
        await loadProcedurePrices(session.token);
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
      return true;
    } catch (reason) {
      const errorMessage =
        reason instanceof Error ? reason.message : "Operação não concluída.";
      setError(errorMessage);
      feedback?.onError?.(errorMessage);
      setLoading(false);
      return false;
    }
  };

  const cancelAttendanceEditing = () => {
    setEditingAttendanceId(null);
    setAtendimentoForm(
      createInitialAtendimentoForm(
        isMedical ? String(session.user.id) : "",
      ),
    );
    setProcedimentos([]);
    setShowForm(false);
  };

  const cancelBillingEditing = () => {
    setEditingBillingId(null);
    setFaturamentoForm(createInitialFaturamentoForm());
    setShowForm(false);
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
  const closeAppeal = () => {
    setAppealTarget(null);
    setAppealDraft({ justificativa: "", valorRecuperado: "0" });
  };

  const submitAppeal = async (event: FormEvent) => {
    event.preventDefault();
    if (!appealTarget) return;
    const valorRecuperado = Number(
      appealDraft.valorRecuperado.replace(",", "."),
    );
    const completed = await run(
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
    );
    if (completed) {
      closeAppeal();
    }
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
    if (receipt.comprovante && !isSupportedReceiptFile(receipt.comprovante)) {
      const message = "Selecione um comprovante bancário no formato PDF ou JPG.";
      setError(message);
      setReceiptToast({ type: "error", message });
      return;
    }
    let createdReceipt:
      | {
          id: number;
          dataRecebimento: string;
          valorRecebido: number;
          formaRecebimento: string;
          referenciaBancaria?: string | null;
        }
      | undefined;
    const completed = await run(
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
        createdReceipt = updated.recebimentos.find(
          (item) => !account.recebimentos.some((old) => old.id === item.id),
        );
        if (receipt.comprovante) {
          if (createdReceipt)
            await uploadComprovanteRecebimento(
              createdReceipt.id,
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
    if (!completed || !createdReceipt) {
      return;
    }

    try {
      await downloadGeneratedReceipt(
        {
          receiptId: createdReceipt.id,
          documentNumber: account.numeroDocumento,
          patient: account.paciente,
          paymentDate: createdReceipt.dataRecebimento,
          amount: createdReceipt.valorRecebido,
          paymentMethod: createdReceipt.formaRecebimento,
          bankReference: createdReceipt.referenciaBancaria,
          registeredBy: session.user.nome,
        },
        receipt.comprovanteFormato,
      );
      setReceipt({
        contaId: "",
        valor: "",
        forma: "Pix",
        referencia: "",
        comprovanteFormato: receipt.comprovanteFormato,
        comprovante: null,
      });
      setReceiptToast({
        type: "success",
        message: `Recebimento registrado e comprovante ${receipt.comprovanteFormato.toUpperCase()} gerado.`,
      });
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Recebimento registrado, mas não foi possível gerar o comprovante.";
      setReceiptToast({ type: "error", message });
    }
  };
  const submitPrice = async (event: FormEvent) => {
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
    const completed = await run(
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
    );
    if (completed) {
      setEditingPriceId(null);
      setPrice(createInitialPriceForm());
    }
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
        <AttendanceSection
          editingId={editingAttendanceId}
          showForm={showForm}
          form={atendimentoForm}
          procedimentos={procedimentos}
          pacientes={pacientes}
          hospitais={hospitais}
          convenios={convenios}
          opmeFornecedores={opmeFornecedores}
          medicalUsers={medicalUsers}
          isMedical={isMedical}
          loading={loading}
          atendimentos={atendimentos}
          setForm={setAtendimentoForm}
          setProcedimentos={setProcedimentos}
          onToggleForm={() => setShowForm((current) => !current)}
          onOpenCbhpm={() => setCbhpmModalOpen(true)}
          onSubmit={submitAtendimento}
          onCancelEditing={cancelAttendanceEditing}
          onSelect={setSelectedAttendance}
          onEdit={editAttendance}
          onDelete={(item) =>
            setConfirmAction({
              title: "Excluir atendimento",
              message: `Excluir o atendimento de ${item.paciente}? Esta ação não poderá ser desfeita.`,
              action: () => deleteAtendimento(item.id, session.token),
              success: "Atendimento excluído.",
            })
          }
        />
      )}


      {tab === "faturamento" && (
        <InvoicingSection
          canManage={canManageBilling}
          editingId={editingBillingId}
          showForm={showForm}
          loading={loading}
          form={faturamentoForm}
          atendimentos={atendimentos}
          faturamentos={faturamentos}
          setForm={setFaturamentoForm}
          onToggleForm={() => setShowForm((current) => !current)}
          onSubmit={submitFaturamento}
          onCancelEditing={cancelBillingEditing}
          onSelect={setSelectedBilling}
          onEdit={editBilling}
          onDelete={(item) =>
            setConfirmAction({
              title: "Excluir faturamento",
              message: `Excluir o faturamento de ${item.paciente}? Os itens em rascunho também serão removidos.`,
              action: () => deleteFaturamento(item.id, session.token),
              success: "Faturamento excluído.",
            })
          }
          onPrepare={(item) =>
            void run(
              () =>
                updateFaturamentoStatus(
                  item.id,
                  {
                    id: item.id,
                    status: "ProntoParaEnvio",
                    rowVersion: item.rowVersion,
                  },
                  session.token,
                ),
              "Faturamento pronto para envio.",
            )
          }
          onSend={(item) =>
            void run(
              () =>
                updateFaturamentoStatus(
                  item.id,
                  {
                    id: item.id,
                    status: "Enviado",
                    rowVersion: item.rowVersion,
                  },
                  session.token,
                ),
              "Faturamento enviado e data de envio registrada.",
            )
          }
          onOpenReturn={openReturn}
          onCreateAccount={createAccount}
          onOpenAppeal={(glosaId, valorGlosado) => {
            setAppealTarget({ glosaId, valorGlosado });
            setAppealDraft({ justificativa: "", valorRecuperado: "0" });
          }}
        />
      )}

      {tab === "financeiro" && canManageBilling && (
        <FinanceSection
          resumo={financeiroResumo}
          received={received}
          openBalance={openBalance}
          filters={financeFilters}
          receipt={receipt}
          receiptToast={receiptToast}
          contas={contas}
          convenios={convenios}
          medicalUsers={medicalUsers}
          pacientes={pacientes}
          page={financePage}
          loading={loading}
          setFilters={setFinanceFilters}
          setReceipt={setReceipt}
          onApplyFilters={(page) => void applyFinanceFilters(page)}
          onSubmitReceipt={submitReceipt}
          onReceiptFileChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (file && !isSupportedReceiptFile(file)) {
              const message =
                "Selecione um comprovante bancário no formato PDF ou JPG.";
              setError(message);
              setReceiptToast({ type: "error", message });
              event.target.value = "";
              setReceipt((current) => ({ ...current, comprovante: null }));
              return;
            }
            setError("");
            setReceipt((current) => ({ ...current, comprovante: file }));
          }}
          onSelectAccount={setSelectedAccount}
          onOpenReversal={(id, valor) => setReversalTarget({ id, valor })}
        />
      )}

      {tab === "precos" && (
        <PricesSection
          canManage={canManageBilling}
          editingId={editingPriceId}
          loading={loading}
          form={price}
          convenios={convenios}
          precos={precos}
          setForm={setPrice}
          onSubmit={submitPrice}
          onCancelEditing={() => {
            setEditingPriceId(null);
            setPrice(createInitialPriceForm());
          }}
          onEdit={(item) => {
            setEditingPriceId(item.id);
            setPrice({
              convenioId: String(item.convenioId),
              cbhpmCodigo: item.cbhpmCodigo,
              valorNegociado: String(item.valorNegociado),
              percentualPrincipal: String(item.percentualPrincipal),
              percentualAuxiliar1: String(item.percentualAuxiliar1),
              percentualAuxiliar2: String(item.percentualAuxiliar2),
              vigenciaInicio: item.vigenciaInicio.slice(0, 10),
              vigenciaFinal: item.vigenciaFinal?.slice(0, 10) || "",
            });
          }}
          onDeactivate={(item) =>
            setConfirmAction({
              title: "Desativar preço",
              message: `Desativar o preço ${item.cbhpmCodigo}? O histórico será preservado.`,
              action: () =>
                deactivateConvenioProcedimentoPreco(item.id, session.token),
              success: "Preço desativado.",
            })
          }
        />
      )}

      {returnTarget && (
        <BillingReturnModal
          draft={returnDraft}
          loading={loading}
          setDraft={setReturnDraft}
          onClose={() => setReturnTarget(null)}
          onSubmit={submitReturn}
        />
      )}
      {appealTarget && (
        <BillingAppealModal
          valorGlosado={appealTarget.valorGlosado}
          draft={appealDraft}
          loading={loading}
          setDraft={setAppealDraft}
          onClose={closeAppeal}
          onSubmit={submitAppeal}
        />
      )}
      {reversalTarget && (
        <BillingReversalModal
          valor={reversalTarget.valor}
          reason={reversalReason}
          loading={loading}
          onReasonChange={setReversalReason}
          onClose={() => {
            setReversalTarget(null);
            setReversalReason("");
          }}
          onSubmit={submitReversal}
        />
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
            <IconButton
              label="Fechar detalhes da conta"
              tone="muted"
              onClick={() => setSelectedAccount(null)}
            >
              <X size={16} />
            </IconButton>
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
                <IconButton
                  label="Editar título"
                  title="Editar título"
                  tone="muted"
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
                  <Pencil size={17} />
                </IconButton>
              )}
            {selectedAccount.status !== "Cancelado" && (
              <Button onClick={() => setCancelReason(" ")}>
                <Ban size={16} />
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
                <Save size={16} />
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
                <Ban size={16} />
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
                        <IconButton
                          label="Baixar"
                          title="Baixar comprovante"
                          onClick={() => void downloadReceipt(item.id)}
                        >
                          <Download size={17} />
                        </IconButton>
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
                  <IconButton
                    label="Editar faturamento"
                    title="Editar faturamento"
                    tone="muted"
                    onClick={() => editBilling(selectedBilling)}
                  >
                    <Pencil size={17} />
                  </IconButton>
                  <IconButton
                    label="Excluir faturamento"
                    title="Excluir faturamento"
                    tone="danger"
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
                    <Trash2 size={17} />
                  </IconButton>
                </>
              )}
              <IconButton
                label="Fechar detalhes do faturamento"
                onClick={() => setSelectedBilling(null)}
              >
                <X size={16} />
              </IconButton>
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
                          <IconButton
                            label="Editar item"
                            title="Editar item"
                            tone="muted"
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
                            <Pencil size={17} />
                          </IconButton>
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
                <Save size={16} />
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
                  <IconButton
                    label="Editar glosa"
                    title="Editar glosa"
                    tone="muted"
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
                    <Pencil size={17} />
                  </IconButton>
                  {!glosa.recursos.length && (
                    <IconButton
                      label="Excluir glosa"
                      title="Excluir glosa"
                      tone="danger"
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
                      <Trash2 size={17} />
                    </IconButton>
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
                      <IconButton
                        label="Editar recurso"
                        title="Editar recurso"
                        tone="muted"
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
                        <Pencil size={17} />
                      </IconButton>
                      {recurso.status === "EmPreparacao" && (
                        <IconButton
                          label="Excluir recurso"
                          title="Excluir recurso"
                          tone="danger"
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
                          <Trash2 size={17} />
                        </IconButton>
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
        <GlosaEditModal
          draft={glosaDraft}
          setDraft={setGlosaDraft}
          onClose={() => setGlosaDraft(null)}
          onSubmit={saveGlosa}
        />
      )}
      {recursoDraft && (
        <RecursoEditModal
          draft={recursoDraft}
          setDraft={setRecursoDraft}
          onClose={() => setRecursoDraft(null)}
          onSubmit={saveRecurso}
        />
      )}

      {confirmAction && (
        <ConfirmationDialog
          tone="delete"
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel="Confirmar"
          cancelLabel="Cancelar"
          loading={loading}
          onCancel={() => setConfirmAction(null)}
          onConfirm={async () => {
            const pending = confirmAction;
            const completed = await run(pending.action, pending.success);
            if (completed) {
              pending.after?.();
              setConfirmAction(null);
            }
          }}
        />
      )}
      {selectedAttendance && (
        <AttendanceDetailsModal
          item={selectedAttendance}
          onEdit={() => editAttendance(selectedAttendance)}
          onDelete={() => {
            const item = selectedAttendance;
            setConfirmAction({
              title: "Excluir atendimento",
              message: `Excluir o atendimento de ${item.paciente}? Esta ação não poderá ser desfeita.`,
              action: () => deleteAtendimento(item.id, session.token),
              success: "Atendimento excluído.",
              after: () => setSelectedAttendance(null),
            });
          }}
          onClose={() => setSelectedAttendance(null)}
        />
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
