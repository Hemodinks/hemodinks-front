import { type FormEvent, useEffect, useState } from 'react';
import { Building2, CheckCircle2, KeyRound, Moon, Palette, Save, Sun } from 'lucide-react';
import type { Theme } from '../../appTypes';
import { updateSystemSettings } from '../../services';
import type { AuthSession, SystemSettings } from '../../types';
import { PasswordForm } from '../../shared/components/PasswordForm';
import { AlertMessage, Button, DataPanel, TextField } from '../../shared/components/ui';
import { getErrorMessage } from '../../shared/utils/formatters';

type SystemSettingsPageProps = {
  session: AuthSession;
  settings: SystemSettings;
  settingsLoading: boolean;
  settingsError: string;
  isAdmin: boolean;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onSettingsUpdated: (settings: SystemSettings) => void;
  onPasswordChanged: (message: string) => void;
};

export function SystemSettingsPage({
  session,
  settings,
  settingsLoading,
  settingsError,
  isAdmin,
  theme,
  onThemeChange,
  onSettingsUpdated,
  onPasswordChanged,
}: SystemSettingsPageProps) {
  const [nomeEmpresa, setNomeEmpresa] = useState(settings.nomeEmpresa);
  const [brandError, setBrandError] = useState('');
  const [brandSuccess, setBrandSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNomeEmpresa(settings.nomeEmpresa);
  }, [settings.nomeEmpresa]);

  const handleSubmitBrand = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdmin || saving) {
      return;
    }

    const nextName = nomeEmpresa.trim();
    setBrandError('');
    setBrandSuccess('');

    if (!nextName) {
      setBrandError('Informe o nome da empresa.');
      return;
    }

    setSaving(true);

    try {
      const updated = await updateSystemSettings({ nomeEmpresa: nextName }, session.token);
      onSettingsUpdated(updated);
      setBrandSuccess('Nome da empresa atualizado.');
    } catch (error) {
      setBrandError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="workspace system-settings-workspace">
      <DataPanel className="system-settings-hero">
        <div className="settings-hero-copy">
          <span className="eyebrow">Configuracao do sistema</span>
          <h2>{isAdmin ? 'Preferencias e marca' : 'Preferencias da conta'}</h2>
        </div>
        <span className="settings-hero-icon" aria-hidden="true">
          <Palette size={24} />
        </span>
      </DataPanel>

      <div className="system-settings-grid">
        {isAdmin && (
          <DataPanel className="system-settings-panel">
            <div className="settings-section-heading">
              <span className="settings-section-icon"><Building2 size={19} /></span>
              <div>
                <span className="eyebrow">Marca</span>
                <h3>Nome da empresa</h3>
              </div>
            </div>

            {settingsError && <AlertMessage type="warning">{settingsError}</AlertMessage>}

            <form className="system-settings-form" onSubmit={handleSubmitBrand}>
              <TextField
                label="Nome exibido no sistema"
                value={nomeEmpresa}
                onValueChange={(value) => setNomeEmpresa(value.slice(0, 120))}
                disabled={settingsLoading || saving}
                maxLength={120}
                required
              />

              {brandError && <AlertMessage type="error">{brandError}</AlertMessage>}
              {brandSuccess && <AlertMessage type="success" icon={<CheckCircle2 size={17} />}>{brandSuccess}</AlertMessage>}

              <Button variant="primary" type="submit" disabled={settingsLoading || saving}>
                <Save size={18} />
                {saving ? 'Salvando...' : 'Salvar nome'}
              </Button>
            </form>
          </DataPanel>
        )}

        <DataPanel className="system-settings-panel">
          <div className="settings-section-heading">
            <span className="settings-section-icon"><Palette size={19} /></span>
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

        <DataPanel className="system-settings-panel system-settings-password-panel">
          <div className="settings-section-heading">
            <span className="settings-section-icon"><KeyRound size={19} /></span>
            <div>
              <span className="eyebrow">Seguranca</span>
              <h3>Alterar senha</h3>
            </div>
          </div>

          {passwordSuccess && <AlertMessage type="success" icon={<CheckCircle2 size={17} />}>{passwordSuccess}</AlertMessage>}

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
