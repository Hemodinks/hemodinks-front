import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Modal } from '../../shared/components/Modal';
import { IconButton } from '../../shared/components/ui';
import type { OptionalConsentCategories } from '../../shared/privacy/consentStorage';

type Props = {
  initialValue: OptionalConsentCategories;
  onClose: () => void;
  onSave: (value: OptionalConsentCategories) => void;
};

export function CookiePreferencesModal({ initialValue, onClose, onSave }: Props) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => setValue(initialValue), [initialValue]);

  return (
    <Modal titleId="cookie-preferences-title" className="cookie-preferences-modal" onClose={onClose}>
      <header className="panel-title">
        <div>
          <span className="eyebrow">Privacidade</span>
          <h2 id="cookie-preferences-title">Configurar cookies e armazenamentos</h2>
        </div>
        <IconButton label="Fechar configurações de cookies" onClick={onClose}><X size={18} /></IconButton>
      </header>

      <p className="cookie-preferences-intro">
        Escolha quais recursos opcionais podem ser usados neste navegador. Sua escolha pode ser alterada a qualquer momento.
      </p>

      <div className="cookie-category-list">
        <section className="cookie-category">
          <div>
            <h3>Necessários</h3>
            <p>Mantêm autenticação, segurança, sessão e a sua própria escolha de privacidade.</p>
          </div>
          <span className="cookie-required-status" aria-label="Cookies necessários sempre ativos">Sempre ativos</span>
        </section>

        <label className="cookie-category">
          <div>
            <h3>Preferências</h3>
            <p>Guardam tema, ordem do painel e opções dos tutoriais neste dispositivo.</p>
          </div>
          <input
            type="checkbox"
            checked={value.preferences}
            onChange={(event) => setValue((current) => ({ ...current, preferences: event.target.checked }))}
          />
        </label>

        <label className="cookie-category">
          <div>
            <h3>Análise</h3>
            <p>Permitem diagnóstico técnico opcional por Sentry, New Relic Browser e OpenTelemetry.</p>
          </div>
          <input
            type="checkbox"
            checked={value.analytics}
            onChange={(event) => setValue((current) => ({ ...current, analytics: event.target.checked }))}
          />
        </label>
      </div>

      <div className="button-row cookie-modal-actions">
        <button type="button" className="ghost-button" onClick={() => onSave({ preferences: false, analytics: false })}>
          Rejeitar opcionais
        </button>
        <button type="button" className="primary-action" onClick={() => onSave(value)}>
          Salvar preferências
        </button>
      </div>
    </Modal>
  );
}
