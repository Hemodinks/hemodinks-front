import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { Building2, CheckCircle2, ImagePlus, KeyRound, Moon, Palette, Save, Sun, Trash2 } from 'lucide-react';
import type { Theme } from '../../appTypes';
import { updateSystemSettings } from '../../services';
import type { AuthSession, SystemSettings } from '../../types';
import { CompanyLogo } from '../../shared/components/CompanyLogo';
import { PasswordForm } from '../../shared/components/PasswordForm';
import { AlertMessage, Button, DataPanel, TextField } from '../../shared/components/ui';
import { readProfilePhoto } from '../../shared/utils/files';
import {
  ALLOWED_PROFILE_PHOTO_TYPES,
  getErrorMessage,
  MAX_PROFILE_PHOTO_BYTES,
} from '../../shared/utils/formatters';
import './settings.css';

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
  const [fotoEmpresa, setFotoEmpresa] = useState(settings.fotoEmpresa ?? null);
  const [brandError, setBrandError] = useState('');
  const [brandSuccess, setBrandSuccess] = useState('');
  const [brandPhotoInputKey, setBrandPhotoInputKey] = useState(0);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNomeEmpresa(settings.nomeEmpresa);
    setFotoEmpresa(settings.fotoEmpresa ?? null);
  }, [settings.fotoEmpresa, settings.nomeEmpresa]);

  const handleCompanyPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setBrandError('');
    setBrandSuccess('');

    if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
      setBrandError('Use uma foto PNG, JPG ou WEBP.');
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setBrandError('A foto deve ter no maximo 1 MB.');
      return;
    }

    try {
      const nextPhoto = await readProfilePhoto(file);
      setFotoEmpresa(nextPhoto);
    } catch (error) {
      setBrandError(getErrorMessage(error));
    }
  };

  const handleRemoveCompanyPhoto = () => {
    setFotoEmpresa(null);
    setBrandError('');
    setBrandSuccess('');
    setBrandPhotoInputKey((current) => current + 1);
  };

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
      const updated = await updateSystemSettings({
        nomeEmpresa: nextName,
        fotoEmpresa,
      }, session.token);
      onSettingsUpdated(updated);
      setBrandSuccess('Marca da empresa atualizada.');
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
          <span className="eyebrow">Configuração do sistema</span>
          <h2>{isAdmin ? 'Preferências e marca' : 'Preferências da conta'}</h2>
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
                <h3>Marca da empresa</h3>
              </div>
            </div>

            {settingsError && <AlertMessage type="warning">{settingsError}</AlertMessage>}

            <form className="system-settings-form" onSubmit={handleSubmitBrand}>
              <div className="company-brand-preview">
                <CompanyLogo
                  companyName={nomeEmpresa.trim() || settings.nomeEmpresa || 'Hemodinks'}
                  photo={fotoEmpresa}
                  className="company-brand-photo"
                />
                <div className="company-brand-copy">
                  <strong>{nomeEmpresa.trim() || settings.nomeEmpresa || 'Hemodinks'}</strong>
                  <span>Esta foto será exibida na tela de login e nos pontos de marca da aplicação.</span>
                </div>
              </div>

              <div className="company-brand-actions">
                <label className="ghost-button file-action" htmlFor="company-photo-input">
                  <ImagePlus size={17} />
                  {fotoEmpresa ? 'Trocar foto' : 'Adicionar foto'}
                </label>
                {fotoEmpresa && (
                  <Button variant="danger-ghost" onClick={handleRemoveCompanyPhoto} disabled={settingsLoading || saving}>
                    <Trash2 size={17} />
                    Remover
                  </Button>
                )}
              </div>
              <input
                key={brandPhotoInputKey}
                id="company-photo-input"
                className="sr-only"
                type="file"
                aria-label="Foto da empresa"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void handleCompanyPhotoChange(event)}
              />
              <span className="file-hint">PNG, JPG ou WEBP ate 1 MB.</span>

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
                {saving ? 'Salvando...' : 'Salvar marca'}
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
