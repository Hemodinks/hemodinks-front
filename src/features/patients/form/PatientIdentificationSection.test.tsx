import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PacienteFormData } from '../../../types';
import { emptyPacienteForm } from '../patientUtils';
import { PatientIdentificationSection } from './PatientIdentificationSection';

describe('issue245: status da cirurgia no cadastro', () => {
  it('mostra Não consolidada por padrão e Consolidada ao preencher a data da consolidação', async () => {
    function Form() {
      const [formData, setFormData] = useState<PacienteFormData>(emptyPacienteForm);
      return <PatientIdentificationSection formData={formData} setFormData={setFormData} />;
    }
    render(<Form />);
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveTextContent('Status da cirurgiaNão consolidada');
    await userEvent.type(screen.getByLabelText('Cirurgias Consolidadas'), '01102026');
    expect(indicator).toHaveTextContent('Status da cirurgiaConsolidada');
    await userEvent.clear(screen.getByLabelText('Cirurgias Consolidadas'));
    expect(indicator).toHaveTextContent('Não consolidada');
  });
});
