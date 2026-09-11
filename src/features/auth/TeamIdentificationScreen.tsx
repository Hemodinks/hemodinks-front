import { type FormEvent, useEffect, useRef, useState } from "react";
import { LogIn, Users } from "lucide-react";
import type { Theme } from "../../appTypes";
import type { TeamLoginChallenge } from "../../types";
import { LoadingOverlay } from "../../shared/components/LoadingOverlay";
import { TechCredit } from "../../shared/components/TechCredit";
import { ThemeToggle } from "../../shared/components/ThemeToggle";
import { AlertMessage } from "../../shared/components/ui";
import { focusFirstInvalidFormField } from "../../shared/utils/focusInvalidFormField";
import "./auth.css";

type TeamIdentificationScreenProps = {
  challenge: TeamLoginChallenge;
  operatorId: string;
  pin: string;
  error: string;
  loading: boolean;
  theme: Theme;
  onOperatorChange: (value: string) => void;
  onPinChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  onThemeToggle: () => void;
};

export function TeamIdentificationScreen({
  challenge,
  operatorId,
  pin,
  error,
  loading,
  theme,
  onOperatorChange,
  onPinChange,
  onSubmit,
  onBack,
  onThemeToggle,
}: TeamIdentificationScreenProps) {
  const selectedOperator = challenge.operadores.find(
    (operator) => String(operator.id) === operatorId,
  );
  const requiresPin = selectedOperator?.exigePin ?? false;
  const [search, setSearch] = useState('');
  const pinInput = useRef<HTMLInputElement>(null);
  const operators = challenge.operadores.filter(operator =>
    String(operator.id) === operatorId || operator.nome.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  useEffect(() => {
    if (requiresPin && !loading) pinInput.current?.focus();
  }, [operatorId, requiresPin, loading]);
  return (
    <main className="auth-screen">
      <LoadingOverlay active={loading} />
      <TechCredit />
      <ThemeToggle theme={theme} onToggle={onThemeToggle} floating />
      <section className="auth-panel" aria-busy={loading}>
        <div className="brand-block">
          <span className="brand-mark">
            <Users size={38} />
          </span>
          <div>
            <span className="eyebrow">Equipe</span>
            <h1>{challenge.equipeNome}</h1>
          </div>
        </div>
        <p className="team-login-description">Selecione seu nome para acessar a equipe.
          {challenge.modoIdentificacao === 'Pin' ? ' Em seguida, informe seu PIN individual.' : ' Este acesso não solicita PIN.'}</p>
        <form className="stack" onSubmit={onSubmit} onInvalid={focusFirstInvalidFormField}>
          {challenge.operadores.length > 8 && <label>Buscar funcionário
            <input type="search" value={search} onChange={event => setSearch(event.target.value)} disabled={loading} />
          </label>}
          {search && operators.length === 0 && <p role="status">Nenhum funcionário encontrado para esta busca.</p>}
          <label>
            Membro da Equipe
            <select
              value={operatorId}
              onChange={(event) => onOperatorChange(event.target.value)}
              required
              disabled={loading}
            >
              <option value="">Selecione seu nome</option>
              {operators.map((operator) => (
                <option key={operator.id} value={operator.id}>
                  {operator.nome}
                </option>
              ))}
            </select>
          </label>
          {requiresPin && (
            <label htmlFor="team-pin">PIN individual
            <input
              ref={pinInput}
              id="team-pin"
              type="password"
              className="team-pin-input"
              inputMode="numeric"
              pattern="[0-9]{6}"
              value={pin}
              onChange={(event) =>
                onPinChange(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              autoComplete="off"
              minLength={6}
              maxLength={6}
              required
              disabled={loading}
            /></label>
          )}
          {challenge.operadores.length === 0 && <AlertMessage type="error">Nenhum funcionário disponível. Entre em contato com a administração da clínica.</AlertMessage>}
          {error && <AlertMessage type="error">{error}</AlertMessage>}
          <div className="button-row login-actions">
            <button type="button" className="ghost-button" onClick={onBack}>
              Voltar
            </button>
            <button className="primary-action" type="submit" disabled={loading || !selectedOperator}>
              <LogIn size={18} />
              {loading ? 'Entrando...' : 'Continuar'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
