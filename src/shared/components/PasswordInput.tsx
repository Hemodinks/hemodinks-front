import { useState } from 'react';
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
          autoComplete={autoComplete}
          data-private={autoComplete === 'new-password' ? true : undefined}
          className={autoComplete === 'new-password' ? 'sentry-mask nr-mask' : undefined}
          minLength={minLength}
          maxLength={maxLength}
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
