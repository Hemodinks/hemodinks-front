import { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Moon, Palette, Tags, Sun } from 'lucide-react';
import type { Theme } from '../../appTypes';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import { PasswordForm } from '../../shared/components/PasswordForm';
import { AlertMessage, DataPanel } from '../../shared/components/ui';
import './settings.css';

type SystemSettingsPageProps = {
  session: AuthSession;
  theme: Theme;
  showPrices: boolean;
  onThemeChange: (theme: Theme) => void;
  onShowPricesChange: (visible: boolean) => void;
  onPasswordChanged: (message: string) => void;
};

export function SystemSettingsPage({
  session,
  theme,
  showPrices,
  onThemeChange,
  onShowPricesChange,
  onPasswordChanged,
}: SystemSettingsPageProps) {
  const [passwordSuccess, setPasswordSuccess] = useState('');

  return (
    <section className="workspace system-settings-workspace">
      <DataPanel className="system-settings-hero">
        <div className="settings-hero-copy">
          <span className="eyebrow">Configuração do sistema</span>
          <h2>Preferências da conta</h2>
        </div>
        <span className="settings-hero-icon" aria-hidden="true">
          <Palette size={24} />
        </span>
      </DataPanel>

      <div className="system-settings-grid">
        <DataPanel className="system-settings-panel">
          <div className="settings-section-heading">
            <span className="settings-section-icon">
              <Palette size={19} />
            </span>
            <div>
              <span className="eyebrow">Aparencia</span>
              <h3>Tema</h3>
            </div>
          </div>
          <div className="theme-choice-grid" role="group" aria-label="Tema do sistema">
            <button
              type="button"
              className={`theme-choice ${theme === 'light' ? 'active' : ''}`}
              onClick={() => onThemeChange('light')}
            >
              <Sun size={21} />
              <strong>Claro</strong>
            </button>
            <button
              type="button"
              className={`theme-choice ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => onThemeChange('dark')}
            >
              <Moon size={21} />
              <strong>Escuro</strong>
            </button>
          </div>
        </DataPanel>

        <DataPanel className="system-settings-panel">
          <div className="settings-section-heading">
            <span className="settings-section-icon">
              <Tags size={19} />
            </span>
            <div>
              <span className="eyebrow">Controladoria</span>
              <h3>Tabela de preços</h3>
            </div>
          </div>
          <p className="settings-preference-description">
            Controle a exibição da Tabela de preços no menu da Controladoria.
          </p>
          <div className="theme-choice-grid" role="group" aria-label="Exibição da tabela de preços">
            <button
              type="button"
              className={`theme-choice ${!showPrices ? 'active' : ''}`}
              onClick={() => onShowPricesChange(false)}
              aria-pressed={!showPrices}
            >
              <EyeOff size={21} />
              <strong>Ocultar</strong>
            </button>
            <button
              type="button"
              className={`theme-choice ${showPrices ? 'active' : ''}`}
              onClick={() => onShowPricesChange(true)}
              aria-pressed={showPrices}
            >
              <Eye size={21} />
              <strong>Exibir</strong>
            </button>
          </div>
        </DataPanel>

        <DataPanel className="system-settings-panel system-settings-password-panel">
          <div className="settings-section-heading">
            <span className="settings-section-icon">
              <KeyRound size={19} />
            </span>
            <div>
              <span className="eyebrow">Seguranca</span>
              <h3>Alterar senha</h3>
            </div>
          </div>
          {passwordSuccess && (
            <AlertMessage type="success" icon={<CheckCircle2 size={17} />}>
              {passwordSuccess}
            </AlertMessage>
          )}
          <PasswordForm
            session={session}
            onChanged={(message) => {
              setPasswordSuccess(message);
              onPasswordChanged(message);
            }}
          />
        </DataPanel>
      </div>
    </section>
  );
}
