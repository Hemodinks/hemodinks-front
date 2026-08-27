import type { Dispatch, SetStateAction } from 'react';
import type { PacienteFormData } from '../../../types';
import { DateInput } from '../../../shared/components/DateInput';
import { CheckboxField, TextField } from '../../../shared/components/ui';
import { formatCurrency, formatCurrencyInput, MAX_NAME_LENGTH } from '../../../shared/utils/formatters';

type Props = {
  formData: PacienteFormData;
  setFormData: Dispatch<SetStateAction<PacienteFormData>>;
  estimatedValue: number;
};

export function PatientFinancialSection({ formData, setFormData, estimatedValue }: Props) {
  return (
    <>
      <div className="two-column-fields">
        <TextField label="Autorização" type="text" value={formData.autorizacao} onValueChange={(value) => setFormData((current) => ({ ...current, autorizacao: value.slice(0, MAX_NAME_LENGTH) }))} maxLength={MAX_NAME_LENGTH} />
        <TextField label="Glosa" type="text" value={formData.repasseGlosa} onValueChange={() => undefined} disabled aria-readonly="true" />
      </div>
      <div className="two-column-fields">
        <TextField label="Valor estimado" type="text" value={formatCurrency(estimatedValue)} onValueChange={() => undefined} disabled aria-readonly="true" />
        <TextField
          label="Valor recebido/pago"
          type="text"
          value={formData.pagamento}
          onValueChange={(value) => setFormData((current) => ({ ...current, pagamento: formatCurrencyInput(value) }))}
          inputMode="decimal"
          onFocus={(event) => event.currentTarget.select()}
          maxLength={24}
          placeholder="R$ 0,00"
        />
      </div>
      <div className="two-column-fields">
        <CheckboxField
          label="Status Pago"
          checked={formData.statusPago}
          onCheckedChange={(checked) => setFormData((current) => ({ ...current, statusPago: checked, dataPagamento: checked ? current.dataPagamento : '' }))}
        />
        <DateInput id="patient-payment-date" label="Data do Pagamento" value={formData.dataPagamento} onChange={(dataPagamento) => setFormData((current) => ({ ...current, dataPagamento }))} disabled={!formData.statusPago} />
      </div>
      <CheckboxField label="Paciente ativo" checked={formData.ativo} onCheckedChange={(checked) => setFormData((current) => ({ ...current, ativo: checked }))} />
    </>
  );
}
