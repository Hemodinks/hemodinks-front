import type { ReactNode } from 'react';

type SettingsCardHeadingProps = { icon: ReactNode; eyebrow: string; title: string; description?: ReactNode };

// Cabeçalho padrão dos cartões de Opções → Configurações (ícone, rótulo, título e descrição curta).
export function SettingsCardHeading({ icon, eyebrow, title, description }: SettingsCardHeadingProps) {
  return (
    <div className="settings-card-heading">
      <span className="settings-section-icon" aria-hidden="true">{icon}</span>
      <div className="settings-card-heading-copy">
        <span className="eyebrow">{eyebrow}</span>
        <h4>{title}</h4>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}

type SettingsGroupProps = { id: string; title: string; description: string; children: ReactNode; className?: string };

// Agrupa cartões por assunto (aparência, segurança da conta, clínica).
export function SettingsGroup({ id, title, description, children, className = '' }: SettingsGroupProps) {
  return (
    <section className={`settings-group ${className}`.trim()} aria-labelledby={id}>
      <header className="settings-group-header">
        <h3 id={id}>{title}</h3>
        <p>{description}</p>
      </header>
      {children}
    </section>
  );
}
