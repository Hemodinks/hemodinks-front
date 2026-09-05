import { type FormEvent, useId, useState } from 'react';
import { AlertMessage } from '../../shared/components/ui';
import { focusFirstInvalidFormField } from '../../shared/utils/focusInvalidFormField';

type Props = {
  authenticated?: boolean;
  current?: boolean;
  loading: boolean;
  accepting: boolean;
  error: string;
  onAccept: () => Promise<boolean | void>;
  onRetry: () => Promise<void>;
  showHeading?: boolean;
};

export function LegalAcceptanceAction({
  authenticated = true,
  current = false,
  loading,
  accepting,
  error,
  onAccept,
  onRetry,
  showHeading = false,
}: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const headingId = useId();
  const disabled = !authenticated || current || loading || accepting;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (acknowledged && !disabled) void onAccept();
  };

  return (
    <section
      className="legal-acceptance-action"
      aria-labelledby={showHeading ? headingId : undefined}
      aria-label={showHeading ? undefined : 'Aceite dos documentos jurídicos'}
    >
      {showHeading && <h2 id={headingId}>Aceite dos documentos</h2>}
      <p>
        {current
          ? 'Seu aceite da versão vigente está registrado para esta clínica.'
          : authenticated
            ? 'Confirme a leitura dos documentos vigentes para continuar utilizando o HemoDinks.'
            : 'Entre na plataforma para registrar este aceite de forma segura para seu usuário e sua clínica.'}
      </p>

      {error ? (
        <div className="stack">
          <AlertMessage type="error">{error}</AlertMessage>
          <button type="button" className="ghost-button" onClick={() => void onRetry()}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <form className="stack" onSubmit={handleSubmit} onInvalid={focusFirstInvalidFormField}>
          <label className="legal-acceptance-check">
            <input
              type="checkbox"
              checked={current || acknowledged}
              disabled={disabled}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span>Li e estou ciente dos Termos de Uso e do Aviso de Privacidade do HemoDinks.</span>
          </label>
          <button type="submit" className="primary-action" disabled={!acknowledged || disabled}>
            {current ? 'Aceite registrado' : accepting ? 'Registrando aceite…' : 'Aceitar e continuar'}
          </button>
        </form>
      )}
    </section>
  );
}
