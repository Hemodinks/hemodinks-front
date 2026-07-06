import { describe, expect, it } from 'vitest';
import { MEDICAL_PROFILE_ID, PATIENT_PROFILE_ID } from '../../shared/utils/formatters';
import { emptyUserForm, validateUserForm } from './userUtils';

describe('userUtils', () => {
  it('nao permite cadastrar paciente pelo formulario de usuarios', () => {
    const error = validateUserForm({
      ...emptyUserForm,
      nome: 'Paciente Oculto',
      email: 'paciente@hemodinks.com',
      telefone: '+55 (81) 99999-9999',
      perfilId: PATIENT_PROFILE_ID,
    });

    expect(error).toBe('Selecione um perfil valido.');
  });

  it('permite cadastrar medico com CRM pelo formulario de usuarios', () => {
    const error = validateUserForm({
      ...emptyUserForm,
      nome: 'Dra. Ana',
      email: 'dra.ana@hemodinks.com',
      telefone: '+55 (81) 99999-9999',
      perfilId: MEDICAL_PROFILE_ID,
      crm: '12345',
      crmUf: 'MG',
    });

    expect(error).toBe('');
  });
});
