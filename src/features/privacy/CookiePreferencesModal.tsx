import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
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
    <Modal
      titleId="cookie-preferences-title"
      descriptionId="cookie-preferences-description"
      className="cookie-preferences-modal"
      backdropClassName="cookie-preferences-backdrop"
      onClose={onClose}
    >
      <header className="panel-title">
        <div>
          <span className="eyebrow">Privacidade</span>
          <h2 id="cookie-preferences-title">Configurar cookies e armazenamentos</h2>
        </div>
        <IconButton label="Fechar configurações de cookies" onClick={onClose}><X size={18} /></IconButton>
      </header>

      <p id="cookie-preferences-description" className="cookie-preferences-intro">
        Escolha quais recursos opcionais podem ser utilizados neste navegador. Os recursos necessários permanecem ativos para autenticação, segurança e funcionamento da plataforma. Você pode alterar essas opções a qualquer momento.
      </p>
      <p className="cookie-preferences-more"><Link to="/politica-de-privacidade" onClick={onClose}>Saiba mais no Aviso de Privacidade</Link></p>

      <div className="cookie-category-list">
        <section className="cookie-category">
          <div>
            <h3>Necessários</h3>
            <p>Permitem autenticação, segurança, manutenção da sessão e armazenamento da sua escolha de privacidade.</p>
          </div>
          <span className="cookie-required-status" aria-label="Cookies necessários sempre ativos">Sempre ativos</span>
        </section>

        <label className="cookie-category">
          <div>
            <h3>Preferências</h3>
            <p>Armazenam configurações como tema, organização do painel e opções dos tutoriais neste dispositivo.</p>
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
            <p>Permitem o envio opcional de informações técnicas para diagnóstico de erros, desempenho e estabilidade por ferramentas como Sentry, New Relic Browser e OpenTelemetry.</p>
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
        <button type="button" className="ghost-button" onClick={() => onSave({ preferences: true, analytics: true })}>
          Aceitar opcionais
        </button>
        <button type="button" className="primary-action" onClick={() => onSave(value)}>
          Salvar preferências
        </button>
      </div>
    </Modal>
  );
}
