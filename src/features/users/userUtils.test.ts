import { describe, expect, it } from 'vitest';
import { MEDICAL_PROFILE_ID, PATIENT_PROFILE_ID, SUPER_ADMIN_PROFILE_ID, TEAM_PROFILE_ID } from '../../shared/utils/formatters';
import { emptyUserForm, toUserPayload, validateUserForm } from './userUtils';

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

  it('nao reenvia CPF legado quando o campo esta oculto', () => {
    const payload = toUserPayload({
      ...emptyUserForm,
      nome: 'Usuario Legado',
      email: 'legado@hemodinks.com',
      telefone: '+55 (81) 99999-9999',
      cpf: '900.000.000-01',
      perfilId: 1,
    });

    expect(payload.cpf).toBeNull();
  });

  it('permite editar usuario de equipe sem telefone', () => {
    const form = {
      ...emptyUserForm,
      nome: 'Raquel Fernandes',
      email: 'equipe@hemodinks.com',
      telefone: '+55 ',
      perfilId: TEAM_PROFILE_ID,
    };

    expect(validateUserForm(form, true)).toBe('');
    expect(toUserPayload(form).telefone).toBe('');
  });

  it('mantem a validacao quando usuario de equipe informa telefone', () => {
    const error = validateUserForm({
      ...emptyUserForm,
      nome: 'Raquel Fernandes',
      email: 'equipe@hemodinks.com',
      telefone: '+55 (81) 1234-5678',
      perfilId: TEAM_PROFILE_ID,
    }, true);

    expect(error).toBe('Informe um celular valido com DDD e 9 digitos.');
  });

  it('permite ao SuperAdministrador manter o próprio perfil na edição', () => {
    const form = {
      ...emptyUserForm,
      nome: 'Super Administrador',
      email: 'superadmin@hemodinks.com',
      telefone: '+55 (81) 99999-9999',
      perfilId: SUPER_ADMIN_PROFILE_ID,
    };

    expect(validateUserForm(form, false, true)).toBe('');
    expect(validateUserForm(form)).toBe('Selecione um perfil valido.');
  });
});
