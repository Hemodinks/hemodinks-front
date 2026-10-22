import { describe, expect, it } from 'vitest';
import { emptyPacienteForm } from './patientUtils';
import { preparePatientPayload } from './patientDomainHelpers';

const procedure = { cbhpmCodigo: '10101012', cbhpmPorte: '2B', procedimento: 'Consulta', valorReferencia: 120 };
const validForm = () => ({
  ...emptyPacienteForm,
  nomePaciente: 'Paciente Teste',
  hospital: 'Hospital Central',
  medico: 'Dra. Ana',
  procedimentos: [procedure],
});

describe('preparePatientPayload', () => {
  it('não prepara payload com cronologia invertida mesmo sem validação nativa do formulário', () => {
    const result = preparePatientPayload({
      pacienteFormData: { ...validForm(), data: '10/10/2026', dataAtendimento: '09/10/2026' },
      medicalUsers: [{ id: 10, nome: 'Dra. Ana', email: 'ana@teste.com' }],
      hospitais: [], convenios: [], opmeFornecedores: [],
    });
    expect(result.payload).toBeNull();
    expect(result.error).toBe('A data da consolidação não pode ser anterior à data da solicitação.');
  });

  it('resolve seleções textuais para os identificadores cadastrados', () => {
    const result = preparePatientPayload({
      pacienteFormData: { ...validForm(), convenio: 'Unimed', opmeFornecedor: 'Fornecedor OPME' },
      medicalUsers: [{ id: 10, nome: 'Dra. Ana', email: 'ana@teste.com' }],
      hospitais: [{ id: 20, nome: 'Hospital Central' }],
      convenios: [{ idConvenio: 30, descricaoConvenio: 'Unimed' }],
      opmeFornecedores: [{ idFornecedor: 40, fornecedor: 'Fornecedor OPME' }],
    });

    expect(result.error).toBe('');
    expect(result.payload).toMatchObject({
      medicoUserId: 10,
      hospitalId: 20,
      convenioId: 30,
      opmeFornecedorId: 40,
    });
  });

  it('rejeita cirurgião digitado que não existe no cadastro médico', () => {
    const result = preparePatientPayload({
      pacienteFormData: validForm(),
      medicalUsers: [],
      hospitais: [{ id: 20, nome: 'Hospital Central' }],
      convenios: [],
      opmeFornecedores: [],
    });

    expect(result.payload).toBeNull();
    expect(result.error).toBe('Selecione um cirurgião cadastrado com perfil Médicos.');
  });

  it('permite principal e auxiliar iguais no payload', () => {
    const result = preparePatientPayload({
      pacienteFormData: {
        ...validForm(),
        medicoUserId: 10,
        medicoAuxiliar1UserId: 10,
        medicoAuxiliar1: 'Dra. Ana',
      },
      medicalUsers: [{ id: 10, nome: 'Dra. Ana', email: 'ana@teste.com' }],
      hospitais: [{ id: 20, nome: 'Hospital Central' }],
      convenios: [],
      opmeFornecedores: [],
    });

    expect(result.error).toBe('');
    expect(result.payload).toMatchObject({ medicoUserId: 10, medicoAuxiliar1UserId: 10 });
  });
});
