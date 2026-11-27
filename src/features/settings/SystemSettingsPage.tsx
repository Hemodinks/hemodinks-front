import { useState } from "react";
import type { IdentityChangedHandler } from "../../shared/identityChange";
import { AtSign, Calculator, CheckCircle2, KeyRound, Moon, Palette, SlidersHorizontal, Sun, SwatchBook } from "lucide-react";
import { useOptionalColorStylePreference } from "../../shared/hooks/ColorStylePreferenceProvider";
import type { Theme } from "../../appTypes";
import type { AuthSession } from "../../types";
import { PasswordForm } from "../../shared/components/PasswordForm";
import { EmailChangeAction } from "../../shared/components/EmailChangeAction";
import { CheckboxField, DataPanel, ToastMessage } from "../../shared/components/ui";
import { useCalculatorPreference } from "../calculator/CalculatorPreferenceProvider";
import { ADMIN_PROFILE_ID, SUPER_ADMIN_PROFILE_ID } from "../../shared/utils/formatterConstants";
import { MfaSettingsPanel } from "./MfaSettingsPanel";
import { AuditSettingsPanel } from "./AuditSettingsPanel";
import { SettingsCardHeading, SettingsGroup } from "./SettingsCardHeading";
import "./settings.css";
import "./settings-layout.css";

type SystemSettingsPageProps = {
  session: AuthSession;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onPasswordChanged: IdentityChangedHandler;
};

export function SystemSettingsPage({
  session,
  theme,
  onThemeChange,
  onPasswordChanged,
}: SystemSettingsPageProps) {
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const colorStylePreference = useOptionalColorStylePreference();
  const { visible, setVisible } = useCalculatorPreference();

  const isAdmin = session.user.perfilId === ADMIN_PROFILE_ID || session.user.perfilId === SUPER_ADMIN_PROFILE_ID;

  return (
    <section className="workspace system-settings-workspace">
      <DataPanel className="system-settings-hero">
        <div className="settings-hero-copy">
          <span className="eyebrow">Opções</span>
          <h2>Configurações</h2>
          <p>Preferências da sua conta, segurança de acesso{isAdmin ? ' e opções da clínica' : ''}.</p>
        </div>
        <span className="settings-hero-icon" aria-hidden="true">
          <SlidersHorizontal size={24} />
        </span>
      </DataPanel>

      <SettingsGroup id="settings-group-preferences" title="Aparência e preferências"
        description="Valem só para você, neste navegador.">
        <div className="settings-group-grid">
          <DataPanel className="system-settings-panel">
            <SettingsCardHeading icon={<Palette size={19} />} eyebrow="Aparência" title="Tema"
              description="Escolha o visual claro ou escuro do sistema." />
            <div className="theme-choice-grid" role="group" aria-label="Tema do sistema">
              <button type="button" className={`theme-choice ${theme === "light" ? "active" : ""}`}
                aria-pressed={theme === "light"} onClick={() => onThemeChange("light")}>
                <Sun size={21} />
                <strong>Claro</strong>
              </button>
              <button type="button" className={`theme-choice ${theme === "dark" ? "active" : ""}`}
                aria-pressed={theme === "dark"} onClick={() => onThemeChange("dark")}>
                <Moon size={21} />
                <strong>Escuro</strong>
              </button>
            </div>
          </DataPanel>

          {colorStylePreference && <DataPanel className="system-settings-panel">
            <SettingsCardHeading icon={<SwatchBook size={19} />} eyebrow="Aparência" title="Cores do Hemodinks"
              description="Cores padrão mantêm as cores de cada tela e componente; cores neutras deixam o sistema em tons neutros, com cor só onde ela indica algo." />
            <div className="theme-choice-grid" role="group" aria-label="Cores do Hemodinks">
              <button type="button" className={`theme-choice ${colorStylePreference.colorStyle === "default" ? "active" : ""}`}
                aria-pressed={colorStylePreference.colorStyle === "default"} onClick={() => colorStylePreference.setColorStyle("default")}>
                <Palette size={21} />
                <strong>Cores padrão</strong>
              </button>
              <button type="button" className={`theme-choice ${colorStylePreference.colorStyle === "neutral" ? "active" : ""}`}
                aria-pressed={colorStylePreference.colorStyle === "neutral"} onClick={() => colorStylePreference.setColorStyle("neutral")}>
                <SwatchBook size={21} />
                <strong>Cores neutras</strong>
              </button>
            </div>
          </DataPanel>}

          <DataPanel className="system-settings-panel">
            <SettingsCardHeading icon={<Calculator size={19} />} eyebrow="Ferramentas" title="Calculadora"
              description="Atalho flutuante para cálculos rápidos em qualquer tela." />
            <CheckboxField label="Exibir calculadora flutuante" checked={visible} onCheckedChange={setVisible} />
            <p className="helper-text">Fica salva neste navegador quando o armazenamento de preferências está autorizado; sem isso, vale só nesta sessão.</p>
          </DataPanel>
        </div>
      </SettingsGroup>

      <SettingsGroup id="settings-group-security" title="Segurança da conta"
        description="Senha, verificação em duas etapas e email usado no login.">
        <div className="settings-group-grid settings-security-grid">
          <DataPanel className="system-settings-panel system-settings-password-panel">
            <SettingsCardHeading icon={<KeyRound size={19} />} eyebrow="Segurança" title="Alterar senha"
              description="Use uma senha forte, que você não use em outros sites." />
            {passwordSuccess && (
              <ToastMessage type="success" icon={<CheckCircle2 size={17} />}>
                {passwordSuccess}
              </ToastMessage>
            )}
            <PasswordForm
              session={session}
              onChanged={(message) => {
                setPasswordSuccess(message);
                onPasswordChanged(message);
              }}
            />
          </DataPanel>
          <div className="settings-stack">
            {isAdmin && <MfaSettingsPanel session={session} onIdentityChanged={onPasswordChanged} />}
            <DataPanel className="system-settings-panel">
              <SettingsCardHeading icon={<AtSign size={19} />} eyebrow="Segurança" title="Alterar email de autenticação"
                description="O email que você usa para entrar no sistema." />
              <EmailChangeAction session={session} onChanged={onPasswordChanged} />
            </DataPanel>
          </div>
        </div>
      </SettingsGroup>

      {isAdmin && (
        <SettingsGroup id="settings-group-clinic" title="Clínica"
          description="Valem para todos os usuários da clínica ativa.">
          <AuditSettingsPanel session={session} />
        </SettingsGroup>
      )}
    </section>
  );
}
