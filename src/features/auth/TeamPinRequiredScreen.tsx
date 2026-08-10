import { type FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import type { Theme } from "../../appTypes";
import type { AuthSession } from "../../types";
import { changeCurrentTeamPin } from "../../services";
import { getErrorMessage } from "../../shared/utils/formatters";
import { LoadingOverlay } from "../../shared/components/LoadingOverlay";
import { PasswordInput } from "../../shared/components/PasswordInput";
import { TechCredit } from "../../shared/components/TechCredit";
import { ThemeToggle } from "../../shared/components/ThemeToggle";
import "./auth.css";

type Props = {
  session: AuthSession;
  theme: Theme;
  onThemeToggle: () => void;
  onChanged: (token: string) => void;
  onLogout: () => void;
};

export function TeamPinRequiredScreen({
  session,
  theme,
  onThemeToggle,
  onChanged,
  onLogout,
}: Props) {
  const [pinAtual, setPinAtual] = useState("");
  const [novoPin, setNovoPin] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const normalizePin = (value: string) => value.replace(/\D/g, "").slice(0, 6);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (novoPin.length !== 6 || confirmacao !== novoPin) {
      setError("Informe um novo PIN de 6 números e repita-o corretamente.");
      return;
    }
    setLoading(true);
    try {
      const result = await changeCurrentTeamPin(
        pinAtual,
        novoPin,
        session.token,
      );
      onChanged(result.token);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-screen compact">
      <LoadingOverlay active={loading} />
      <TechCredit />
      <ThemeToggle theme={theme} onToggle={onThemeToggle} floating />
      <section className="auth-panel password-required">
        <div className="brand-block">
          <KeyRound size={36} strokeWidth={1.8} />
          <div>
            <span className="eyebrow">Identificação individual</span>
            <h1>Crie seu PIN</h1>
          </div>
        </div>
        <p>
          O PIN fornecido pelo administrador é temporário. Defina um PIN pessoal
          antes de continuar.
        </p>
        <form className="stack" onSubmit={submit}>
          <PasswordInput
            id="current-team-pin"
            label="PIN temporário"
            value={pinAtual}
            onChange={(value) => setPinAtual(normalizePin(value))}
            autoComplete="one-time-code"
            minLength={6}
            maxLength={6}
            required
          />
          <PasswordInput
            id="new-team-pin"
            label="Novo PIN"
            value={novoPin}
            onChange={(value) => setNovoPin(normalizePin(value))}
            autoComplete="new-password"
            minLength={6}
            maxLength={6}
            required
          />
          <PasswordInput
            id="confirm-team-pin"
            label="Confirmar novo PIN"
            value={confirmacao}
            onChange={(value) => setConfirmacao(normalizePin(value))}
            autoComplete="new-password"
            minLength={6}
            maxLength={6}
            required
          />
          {error && <p className="alert error">{error}</p>}
          <div className="button-row login-actions">
            <button type="button" className="ghost-button" onClick={onLogout}>
              Sair
            </button>
            <button type="submit" className="primary-action" disabled={loading}>
              Salvar PIN
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
