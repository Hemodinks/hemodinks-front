import { type FormEvent, useId, useState } from 'react';

type Props = {
  loading: boolean;
  accepting: boolean;
  error: string;
  onAccept: () => Promise<boolean | void>;
  onRetry: () => Promise<void>;
  showHeading?: boolean;
};

export function LegalAcceptanceAction({
  loading,
  accepting,
  error,
  onAccept,
  onRetry,
  showHeading = false,
}: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const headingId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (acknowledged && !loading && !accepting) void onAccept();
  };

  return (
    <section
      className="legal-acceptance-action"
      aria-labelledby={showHeading ? headingId : undefined}
      aria-label={showHeading ? undefined : 'Aceite dos documentos jurídicos'}
    >
      {showHeading && <h2 id={headingId}>Aceite dos documentos</h2>}
      <p>Confirme a leitura dos documentos vigentes para continuar utilizando o HemoDinks.</p>

      {error ? (
        <div className="stack">
          <p className="alert error">{error}</p>
          <button type="button" className="ghost-button" onClick={() => void onRetry()}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <form className="stack" onSubmit={handleSubmit}>
          <label className="legal-acceptance-check">
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={loading || accepting}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span>Li e estou ciente dos Termos de Uso e do Aviso de Privacidade do HemoDinks.</span>
          </label>
          <button type="submit" className="primary-action" disabled={!acknowledged || loading || accepting}>
            {accepting ? 'Registrando aceite…' : 'Aceitar e continuar'}
          </button>
        </form>
      )}
    </section>
  );
}
