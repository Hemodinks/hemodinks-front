export const LOGIN_PASSWORD = ['acesso', 'teste', 'ci'].join('-');

export const session = {
  token: 'jwt-token',
  user: {
    id: 99,
    nome: 'George Marcone',
    email: 'gmarcone@gmail.com',
    cpf: '00000000191',
    fotoPerfil: null,
    precisaTrocarSenha: false,
    perfilId: 1,
    perfilNome: 'Administrador',
    clinicaId: 1,
    clinicaSlug: 'clinica-e2e',
  },
};

export const patientSession = {
  token: 'patient-token',
  user: {
    id: 20,
    nome: 'Paciente Hemodinks',
    email: 'paciente@hemodinks.com',
    cpf: '11144477735',
    fotoPerfil: null,
    precisaTrocarSenha: false,
    perfilId: 3,
    perfilNome: 'Pacientes',
  },
};

export const paciente = {
  id: 10,
  userId: 20,
  data: '2026-06-01T00:00:00Z',
  nomePaciente: 'Paciente Hemodinks',
  hospitalId: 1,
  hospital: 'Santa Clara - Mater Dei',
  medicoUserId: 1,
  medico: 'Dra. Ana',
  convenioId: 7,
  convenio: 'Particular',
  cbhpmCodigo: '1.01.01.01-2',
  cbhpmPorte: '2B',
  procedimento: 'Consulta',
  procedimentos: [
    {
      cbhpmCodigo: '1.01.01.01-2',
      cbhpmPorte: '2B',
      procedimento: 'Consulta',
      valorReferencia: null,
      ordem: 1,
    },
  ],
  autorizacao: 'AUT-1',
  pagamento: 'Pix',
  repasseGlosa: 'Sem glosa',
  statusPago: true,
  cpf: '11144477735',
  email: 'paciente@hemodinks.com',
  telefone: '+5581998888888',
  fotoPerfil: null,
  dataNascimento: '1992-05-10T00:00:00Z',
  ativo: true,
  arquivosCount: 0,
  arquivos: [],
};

export const cbhpmItem = {
  id: 1,
  codigo: '1.01.01.01-2',
  porte: '2B',
  procedimento: 'Consulta',
  valorReferencia: 120,
};

export const opmeFornecedor = {
  idFornecedor: 1,
  fornecedor: 'Promedom',
};

export const user = {
  id: 1,
  nome: 'Ana Hemodinks',
  email: 'ana@hemodinks.com',
  telefone: '+5581999999999',
  cpf: '52998224725',
  crm: '12345',
  crmUf: 'PE',
  fotoPerfil: null,
  dataCadastro: '2026-06-01T00:00:00Z',
  dataNascimento: '1990-01-01T00:00:00Z',
  ativo: true,
  precisaTrocarSenha: false,
  perfilId: 2,
  perfilNome: 'Medicos',
  arquivosCount: 0,
  arquivos: [],
};

export const agendaEvent = {
  id: 30,
  userId: 99,
  medicalUserId: null,
  medicalUserName: null,
  title: 'Evento existente',
  description: 'Criado pelo mock',
  start: '2026-06-11T12:00:00.000Z',
  end: '2026-06-11T13:00:00.000Z',
  notifyMedicalProfile: false,
  notifyUser: true,
  reminderPeriodMinutes: 1440,
  isCompleted: false,
};

export const billingAttendance = {
  id: 40,
  pacienteId: paciente.id,
  paciente: paciente.nomePaciente,
  dataProcedimento: '2026-07-10',
  convenioId: 7,
  medicoResponsavelId: user.id,
  status: 'Realizado',
  procedimentos: [
    {
      id: 401,
      cbhpmCodigo: '1.01.01.01-2',
      descricao: 'Consulta',
      quantidade: 1,
      pesoPercentual: 100,
      valorReferencia: 120,
      valorNegociado: 120,
      ordem: 1,
    },
  ],
};

export const billingRecords = ['Enviado', 'Aprovado', 'ProntoParaEnvio'].map((status, index) => ({
  id: 50 + index,
  atendimentoCirurgicoId: billingAttendance.id,
  pacienteId: paciente.id,
  paciente: `Paciente faturamento ${index + 1}`,
  convenioId: 7,
  numeroGuia: `GUIA-${index + 1}`,
  competencia: '2026-07-01',
  valorApresentado: 120,
  valorGlosado: 0,
  valorGlosaRecuperada: 0,
  valorReconhecido: 120,
  status,
  rowVersion: '',
  itens: [
    {
      id: 501 + index,
      codigo: '1.01.01.01-2',
      descricao: 'Consulta',
      quantidade: 1,
      pesoPercentual: 100,
      valorUnitario: 120,
      valorApresentado: 120,
      valorGlosado: 0,
      valorAprovado: 120,
      status: 'Aprovado',
      ordem: 1,
    },
  ],
  glosas: [],
}));

export const financeAccount = {
  id: 60,
  faturamentoId: billingRecords[0].id,
  pacienteId: paciente.id,
  paciente: paciente.nomePaciente,
  convenioId: 7,
  numeroDocumento: 'FAT-E2E-01',
  descricao: 'Honorários médicos',
  competencia: '2026-07-01',
  dataEmissao: '2026-07-10',
  dataVencimento: '2026-07-30',
  valorOriginal: 400,
  valorAjustado: 400,
  valorRecebido: 200,
  saldoAberto: 200,
  status: 'ParcialmenteRecebido',
  rowVersion: '',
  recebimentos: [
    {
      id: 601,
      dataRecebimento: '2026-07-23',
      valorRecebido: 200,
      formaRecebimento: 'Pix',
      documentoComprovante: 'comprovante.pdf',
      estornado: false,
    },
  ],
};

export const negotiatedPrice = {
  id: 70,
  convenioId: 7,
  cbhpmCodigo: '1.01.01.01-2',
  valorNegociado: 200,
  percentualPrincipal: 100,
  percentualAuxiliar1: 0,
  percentualAuxiliar2: 0,
  vigenciaInicio: '2026-07-24',
  vigenciaFinal: '2026-07-30',
  ativo: true,
};

export function paged<T>(items: T[]) {
  return {
    items,
    page: 1,
    pageSize: 10,
    totalItems: items.length,
    totalPages: 1,
  };
}
