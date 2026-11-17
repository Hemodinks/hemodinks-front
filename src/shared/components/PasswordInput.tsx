import { type ClipboardEvent, type HTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  maxLength: number;
  minLength?: number;
  required?: boolean;
  errorId?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  pattern?: string;
  title?: string;
  onPaste?: (event: ClipboardEvent<HTMLInputElement>) => void;
};

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  maxLength,
  minLength,
  required = false,
  errorId,
  inputMode,
  pattern,
  title,
  onPaste,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`;

  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input-control">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onPaste={onPaste}
          autoComplete={autoComplete}
          data-private={autoComplete === 'new-password' ? true : undefined}
          className={autoComplete === 'new-password' ? 'nr-mask' : undefined}
          minLength={minLength}
          maxLength={maxLength}
          inputMode={inputMode}
          pattern={pattern}
          title={title}
          required={required}
          aria-invalid={errorId ? true : undefined}
          aria-describedby={errorId}
        />
        <button
          type="button"
          className="password-visibility-button"
          onClick={() => setVisible((current) => !current)}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}
