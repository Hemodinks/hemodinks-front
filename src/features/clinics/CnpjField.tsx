import { useState } from 'react';
import { formatCnpjInput, getCnpjValidationMessage, MAX_CNPJ_MASK_LENGTH } from '../../shared/utils/cnpj';

type Props = {
  value: string;
  onValueChange: (value: string) => void;
};

export function CnpjField({ value, onValueChange }: Props) {
  const [touched, setTouched] = useState(false);
  const error = getCnpjValidationMessage(value);
  const showError = touched && Boolean(error);

  return (
    <label>CNPJ
      <input
        ref={(input) => input?.setCustomValidity(error)}
        value={value}
        onChange={(event) => onValueChange(formatCnpjInput(event.target.value))}
        onBlur={() => setTouched(true)}
        onInvalid={() => setTouched(true)}
        inputMode="numeric"
        maxLength={MAX_CNPJ_MASK_LENGTH}
        placeholder="00.000.000/0000-00"
        aria-invalid={showError}
        aria-describedby={showError ? 'clinic-cnpj-error' : undefined}
        required
      />
      {showError && <small id="clinic-cnpj-error" className="field-error" role="alert">{error}</small>}
    </label>
  );
}
