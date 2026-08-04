import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react';
import { FileUp, Wallet } from 'lucide-react';
import { Button, DataPanel, SelectField, TextField } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import type { ContaReceber } from './billingDomainTypes';
import type { ReceiptFormState, ReceiptToastState } from './billingPageTypes';
import type { GeneratedReceiptFormat } from './receiptDocument';

type FinanceReceiptPanelProps = {
  receipt: ReceiptFormState;
  receiptToast: ReceiptToastState | null;
  contas: ContaReceber[];
  loading: boolean;
  setReceipt: Dispatch<SetStateAction<ReceiptFormState>>;
  onSubmitReceipt: (event: FormEvent) => void;
  onReceiptFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function FinanceReceiptPanel({
  receipt,
  receiptToast,
  contas,
  loading,
  setReceipt,
  onSubmitReceipt,
  onReceiptFileChange,
}: FinanceReceiptPanelProps) {
  return (
    <DataPanel className="billing-finance-receipt-panel">
      <div className="billing-section-heading">
        <div>
          <span className="eyebrow">Financeiro</span>
          <h3>Registrar recebimento</h3>
        </div>
        <Wallet size={20} />
      </div>
      <form className="billing-filter-grid billing-receipt-form" onSubmit={onSubmitReceipt}>
        <SelectField
          label="Título"
          value={receipt.contaId}
          required
          onChange={(event) =>
            setReceipt((current) => ({ ...current, contaId: event.target.value }))
          }
        >
          <option value="">Selecione</option>
          {contas
            .filter((account) => account.saldoAberto > 0)
            .map((account) => (
              <option key={account.id} value={account.id}>
                {account.numeroDocumento} — {account.paciente} —{' '}
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
          onValueChange={(valor) => setReceipt((current) => ({ ...current, valor }))}
        />
        <SelectField
          label="Forma"
          value={receipt.forma}
          onChange={(event) => setReceipt((current) => ({ ...current, forma: event.target.value }))}
        >
          {['Pix', 'Transferencia', 'Boleto', 'Dinheiro', 'Cartao', 'Deposito', 'Outro'].map(
            (forma) => (
              <option key={forma}>{forma}</option>
            ),
          )}
        </SelectField>
        <TextField
          label="Referência bancária"
          value={receipt.referencia}
          onValueChange={(referencia) => setReceipt((current) => ({ ...current, referencia }))}
        />
        <div className="billing-receipt-actions">
          <SelectField
            className="billing-receipt-format"
            label="Formato do comprovante gerado"
            value={receipt.comprovanteFormato}
            onChange={(event) =>
              setReceipt((current) => ({
                ...current,
                comprovanteFormato: event.target.value as GeneratedReceiptFormat,
              }))
            }
          >
            <option value="pdf">PDF</option>
            <option value="jpg">JPG</option>
          </SelectField>
          <div className="billing-receipt-upload">
            <span className="billing-attendance-field-label">Comprovante bancário (opcional)</span>
            <label
              className="ghost-button file-action full-width"
              htmlFor="billing-receipt-file"
              title={
                receipt.comprovante ? receipt.comprovante.name : 'Selecionar arquivo PDF ou JPG'
              }
            >
              <FileUp size={17} />
              <span className="billing-receipt-file-name">
                {receipt.comprovante ? receipt.comprovante.name : 'Selecionar arquivo PDF ou JPG'}
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
            role={receiptToast.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {receiptToast.message}
          </div>
        )}
      </form>
    </DataPanel>
  );
}
