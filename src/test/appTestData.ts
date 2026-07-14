import type { AuthSession, Licenca, Paciente, User } from '../types';

export const SESSION_KEY = 'hemodinks.session';

export const baseUser: User = {
  id: 1,
  nome: 'Ana Hemodinks',
  email: 'ana@hemodinks.com',
  telefone: '+5581999999999',
  cpf: '52998224725',
  crm: '12345',
  crmUf: 'PE',
  fotoPerfil: 'data:image/png;base64,ana',
  dataCadastro: '2026-06-01T00:00:00Z',
  dataNascimento: '1990-01-01T00:00:00Z',
  ativo: true,
  precisaTrocarSenha: false,
  perfilId: 2,
  perfilNome: 'Médicos',
};

export const basePaciente: Paciente = {
  id: 10,
  userId: 20,
  data: '2026-06-01T00:00:00Z',
  nomePaciente: 'Paciente Hemodinks',
  diagnostico: 'Diagnostico inicial',
  tratamentoMedico: 'Tratamento inicial',
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

export function paged<T>(items: T[], page = 1, pageSize = 10, totalItems = items.length) {
  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}

export function buildMedicalLicense(featuresEfetivas: string[] = [
  'Dashboard.Visualizar',
  'Pacientes.Visualizar',
  'Cbhpm.Consultar',
]): Licenca {
  return {
    id: 1,
    userId: 99,
    controleAplicavel: true,
    plano: 'Trial',
    status: 'Ativa',
    dataInicioTrial: '2026-06-01T00:00:00Z',
    dataFimTrial: '2026-07-15T00:00:00Z',
    featuresLiberadas: featuresEfetivas,
    featuresEfetivas,
    trialExpirado: false,
    licencaExpirada: false,
    ativa: true,
    acessoCompleto: false,
    diasRestantesTrial: 9,
    observacoes: null,
    dataCadastro: '2026-06-01T00:00:00Z',
    dataAtualizacao: '2026-06-22T12:00:00Z',
  };
}

export function mockSession(overrides?: Partial<AuthSession['user']>) {
  const user: AuthSession['user'] = {
    id: 99,
    clinicaId: 1,
    clinicaSlug: 'hemodinks',
    nome: 'George Marcone',
    email: 'gmarcone@gmail.com',
    cpf: '00000000191',
    fotoPerfil: null,
    precisaTrocarSenha: false,
    perfilId: 1,
    perfilNome: 'Administrador',
    ...overrides,
  };

  if (user.perfilId === 2 && user.licenca === undefined) {
    user.licenca = buildMedicalLicense();
  }

  return {
    token: 'jwt-token',
    user,
  };
}

export function toLoginResponse(session: AuthSession) {
  return {
    id: session.user.id,
    clinicaId: session.user.clinicaId,
    clinicaSlug: session.user.clinicaSlug ?? null,
    nome: session.user.nome,
    email: session.user.email,
    cpf: session.user.cpf ?? null,
    crm: session.user.crm ?? null,
    crmUf: session.user.crmUf ?? null,
    token: session.token,
    fotoPerfil: session.user.fotoPerfil ?? null,
    precisaTrocarSenha: session.user.precisaTrocarSenha,
    perfilId: session.user.perfilId,
    perfilNome: session.user.perfilNome,
    licenca: session.user.licenca ?? null,
  };
}
