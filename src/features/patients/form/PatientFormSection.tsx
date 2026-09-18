import { type ReactNode, useId } from 'react';

type Props = { title: string; description?: string; children: ReactNode };

export function PatientFormSection({ title, description, children }: Props) {
  const titleId = useId();
  return (
    <section className="patient-form-section" aria-labelledby={titleId}>
      <header className="patient-form-section-heading">
        <h3 id={titleId}>{title}</h3>
        {description && <p>{description}</p>}
      </header>
      <div className="patient-form-section-fields">{children}</div>
    </section>
  );
}
