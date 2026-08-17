import { type FormEvent } from "react";
import { LogIn, Users } from "lucide-react";
import type { Theme } from "../../appTypes";
import type { TeamLoginChallenge } from "../../types";
import { LoadingOverlay } from "../../shared/components/LoadingOverlay";
import { PasswordInput } from "../../shared/components/PasswordInput";
import { TechCredit } from "../../shared/components/TechCredit";
import { ThemeToggle } from "../../shared/components/ThemeToggle";
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
  return (
    <main className="auth-screen">
      <LoadingOverlay active={loading} />
      <TechCredit />
      <ThemeToggle theme={theme} onToggle={onThemeToggle} floating />
      <section className="auth-panel">
        <div className="brand-block">
          <span className="brand-mark">
            <Users size={38} />
          </span>
          <div>
            <span className="eyebrow">Equipe</span>
            <h1>{challenge.equipeNome}</h1>
          </div>
        </div>
        <form className="stack" onSubmit={onSubmit}>
          <label>
            Membro da Equipe
            <select
              value={operatorId}
              onChange={(event) => onOperatorChange(event.target.value)}
              required
            >
              <option value="">Selecione seu nome</option>
              {challenge.operadores.map((operator) => (
                <option key={operator.id} value={operator.id}>
                  {operator.nome}
                </option>
              ))}
            </select>
          </label>
          {requiresPin && (
            <PasswordInput
              id="team-pin"
              label="PIN individual"
              value={pin}
              onChange={(value) =>
                onPinChange(value.replace(/\D/g, "").slice(0, 6))
              }
              autoComplete="one-time-code"
              minLength={6}
              maxLength={6}
              required
            />
          )}
          {selectedOperator && !requiresPin && (
            <p className="alert">
              A identificação é apenas nominal. Ações sensíveis ficam bloqueadas
              sem um PIN individual.
            </p>
          )}
          {error && <p className="alert error">{error}</p>}
          <div className="button-row login-actions">
            <button type="button" className="ghost-button" onClick={onBack}>
              Voltar
            </button>
            <button className="primary-action" type="submit" disabled={loading}>
              <LogIn size={18} />
              Continuar
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
