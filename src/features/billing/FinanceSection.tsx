import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  FileUp,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import {
  Button,
  DataPanel,
  SelectField,
  TextField,
} from "../../shared/components/ui";
import { formatCurrency } from "../../shared/utils/formatters";
import type {
  ContaReceber,
  Convenio,
  FinanceiroResumo,
  MedicalUserOption,
  Paciente,
} from "../../types";
import type { GeneratedReceiptFormat } from "./receiptDocument";
import type {
  FinanceFiltersState,
  FinancePageState,
  ReceiptFormState,
  ReceiptToastState,
} from "./billingPageTypes";
import {
  FinanceAccountsTable,
  FinanceSummaryCards,
} from "./FinanceSectionParts";

type FinanceSectionProps = {
  resumo: FinanceiroResumo | null;
  received: number;
  openBalance: number;
  filters: FinanceFiltersState;
  receipt: ReceiptFormState;
  receiptToast: ReceiptToastState | null;
  contas: ContaReceber[];
  convenios: Convenio[];
  medicalUsers: MedicalUserOption[];
  pacientes: Paciente[];
  page: FinancePageState;
  loading: boolean;
  setFilters: Dispatch<SetStateAction<FinanceFiltersState>>;
  setReceipt: Dispatch<SetStateAction<ReceiptFormState>>;
  onApplyFilters: (page: number) => void;
  onSubmitReceipt: (event: FormEvent) => void;
  onReceiptFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSelectAccount: (account: ContaReceber) => void;
  onOpenReversal: (id: number, valor: number) => void;
};

export function FinanceSection({
  resumo,
  received,
  openBalance,
  filters,
  receipt,
  receiptToast,
  contas,
  convenios,
  medicalUsers,
  pacientes,
  page,
  loading,
  setFilters,
  setReceipt,
  onApplyFilters,
  onSubmitReceipt,
  onReceiptFileChange,
  onSelectAccount,
  onOpenReversal,
}: FinanceSectionProps) {
  return (
    <>
      <FinanceSummaryCards
        resumo={resumo}
        received={received}
        openBalance={openBalance}
      />
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
                onApplyFilters(1);
              }}
            >
              <TextField
                label="Buscar por documento ou paciente"
                placeholder="Ex.: FAT-1-01 ou nome do paciente"
                value={filters.termo}
                onValueChange={(termo) =>
                  setFilters((current) => ({ ...current, termo }))
                }
              />
              <TextField
                label="Competência"
                type="month"
                value={filters.competencia}
                onValueChange={(competencia) =>
                  setFilters((current) => ({ ...current, competencia }))
                }
              />
              <TextField
                label="Vencimento inicial"
                type="date"
                value={filters.vencimentoInicio}
                onValueChange={(vencimentoInicio) =>
                  setFilters((current) => ({ ...current, vencimentoInicio }))
                }
              />
              <TextField
                label="Vencimento final"
                type="date"
                value={filters.vencimentoFim}
                onValueChange={(vencimentoFim) =>
                  setFilters((current) => ({ ...current, vencimentoFim }))
                }
              />
              <SelectField
                label="Convênio"
                value={filters.convenioId}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    convenioId: event.target.value,
                  }))
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
                value={filters.medicoId}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    medicoId: event.target.value,
                  }))
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
                value={filters.pacienteId}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    pacienteId: event.target.value,
                  }))
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
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
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
                ].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </SelectField>
              <Button variant="primary" type="submit" disabled={loading}>
                <SlidersHorizontal size={16} />
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
        <form
          className="billing-filter-grid billing-receipt-form"
          onSubmit={onSubmitReceipt}
        >
          <SelectField
            label="Título"
            value={receipt.contaId}
            required
            onChange={(event) =>
              setReceipt((current) => ({
                ...current,
                contaId: event.target.value,
              }))
            }
          >
            <option value="">Selecione</option>
            {contas
              .filter((account) => account.saldoAberto > 0)
              .map((account) => (
                <option key={account.id} value={account.id}>
                  {account.numeroDocumento} — {account.paciente} —{" "}
                  {formatCurrency(account.saldoAberto)}
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
            onValueChange={(valor) =>
              setReceipt((current) => ({ ...current, valor }))
            }
          />
          <SelectField
            label="Forma"
            value={receipt.forma}
            onChange={(event) =>
              setReceipt((current) => ({
                ...current,
                forma: event.target.value,
              }))
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
            ].map((forma) => (
              <option key={forma}>{forma}</option>
            ))}
          </SelectField>
          <TextField
            label="Referência bancária"
            value={receipt.referencia}
            onValueChange={(referencia) =>
              setReceipt((current) => ({ ...current, referencia }))
            }
          />
          <div className="billing-receipt-actions">
            <SelectField
              className="billing-receipt-format"
              label="Formato do comprovante gerado"
              value={receipt.comprovanteFormato}
              onChange={(event) =>
                setReceipt((current) => ({
                  ...current,
                  comprovanteFormato: event.target
                    .value as GeneratedReceiptFormat,
                }))
              }
            >
              <option value="pdf">PDF</option>
              <option value="jpg">JPG</option>
            </SelectField>
            <div className="billing-receipt-upload">
              <span className="billing-attendance-field-label">
                Comprovante bancário (opcional)
              </span>
              <label
                className="ghost-button file-action full-width"
                htmlFor="billing-receipt-file"
                title={
                  receipt.comprovante
                    ? receipt.comprovante.name
                    : "Selecionar arquivo PDF ou JPG"
                }
              >
                <FileUp size={17} />
                <span className="billing-receipt-file-name">
                  {receipt.comprovante
                    ? receipt.comprovante.name
                    : "Selecionar arquivo PDF ou JPG"}
                </span>
              </label>
              <input
                id="billing-receipt-file"
                className="sr-only"
                type="file"
                accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
                onChange={onReceiptFileChange}
              />
            </div>
            <Button
              className="billing-receipt-submit"
              variant="primary"
              type="submit"
              disabled={loading}
            >
              <Wallet size={16} />
              Registrar recebimento
            </Button>
          </div>
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
      <FinanceAccountsTable
        contas={contas}
        page={page}
        onApplyFilters={onApplyFilters}
        onSelectAccount={onSelectAccount}
        onOpenReversal={onOpenReversal}
      />
    </>
  );
}
