export type User = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cpf?: string | null;
  crm?: string | null;
  crmUf?: string | null;
  fotoPerfil?: string | null;
  dataCadastro: string;
  dataCriacao?: string | null;
  dataAtualizacao?: string | null;
  dataAlteracao?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  modifiedAt?: string | null;
  dataNascimento: string;
  ativo: boolean;
  precisaTrocarSenha: boolean;
  perfilId: number;
  perfilNome: string;
  arquivosCount?: number;
  arquivos?: UserArquivo[];
};

export type MedicalUserOption = {
  id: number;
  nome: string;
  email: string;
};

export type MedicalGroupMember = {
  userId: number;
  nome: string;
  email: string;
};

export type MedicalGroup = {
  id: number;
  nome: string;
  ativo: boolean;
  dataCadastro: string;
  dataAtualizacao?: string | null;
  membrosCount: number;
  membros: MedicalGroupMember[];
};

export type MedicalGroupFormData = {
  nome: string;
  ativo: boolean;
  medicoUserIds: number[];
};

export type UserArquivo = {
  id: number;
  nomeOriginal: string;
  contentType: string;
  tamanhoBytes: number;
  url: string;
  dataUpload: string;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  profileId?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
};

export type PacienteListQuery = ListQuery & {
  medico?: string;
  convenio?: string;
  procedimento?: string;
};

export type CbhpmListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  codigo?: string;
  procedimento?: string;
  porte?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
};

export type CbhpmGeral = {
  id: number;
  codigo: string;
  procedimento: string;
  porte?: string | null;
  custoOperacional?: number | null;
  valorReferencia?: number | null;
  capitulo?: string | null;
  grupo?: string | null;
  paginaPdf?: number | null;
};

export type PacienteProcedimento = {
  id?: number;
  cbhpmCodigo?: string | null;
  cbhpmPorte?: string | null;
  procedimento: string;
  valorReferencia?: number | null;
  ordem?: number | null;
};

export type Hospital = {
  id: number;
  nome: string;
};

export type Convenio = {
  idConvenio: number;
  descricaoConvenio: string;
};

export type OpmeFornecedor = {
  idFornecedor: number;
  fornecedor: string;
};

export type DashboardSummary = {
  usersCount: number;
  activeUsersCount: number;
  pacientesCount: number;
  activePatientsCount: number;
  pendingPaymentsCount: number;
  patientFilesCount: number;
  upcomingEventsCount: number;
};

export type DashboardNotification = {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  pacienteId: number;
  eventId?: number | null;
  nomePaciente: string;
  medico?: string | null;
  procedimento?: string | null;
  data?: string | null;
};

export type AgendaEvent = {
  id: number;
  userId: number;
  userName: string;
  medicalUserId?: number | null;
  medicalUserName?: string | null;
  title: string;
  description?: string | null;
  start: string;
  end: string;
  notifyMedicalProfile: boolean;
  notifyUser: boolean;
  reminderPeriodMinutes?: number | null;
  lastReminderSentAt?: string | null;
  nextReminderAt?: string | null;
  isCompleted: boolean;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type AgendaEventPayload = {
  userId?: number | null;
  medicalUserId?: number | null;
  title: string;
  description?: string | null;
  start: string;
  end: string;
  notifyMedicalProfile: boolean;
  notifyUser: boolean;
  reminderPeriodMinutes?: number | null;
  isCompleted?: boolean | null;
};

export type AgendaMedicalUser = {
  id: number;
  nome: string;
};

export type PublicHoliday = {
  date: string;
  localName: string;
  name: string;
  global: boolean;
  types: string[];
};

export type LoginResponse = {
  id: number;
  nome: string;
  email: string;
  cpf?: string | null;
  crm?: string | null;
  crmUf?: string | null;
  token: string;
  fotoPerfil?: string | null;
  precisaTrocarSenha: boolean;
  perfilId: number;
  perfilNome: string;
};

export type SessionUser = Pick<LoginResponse, 'id' | 'nome' | 'email' | 'cpf' | 'crm' | 'crmUf' | 'fotoPerfil' | 'precisaTrocarSenha' | 'perfilId' | 'perfilNome'>;

export type AuthSession = {
  token: string;
  user: SessionUser;
};

export type UserFormData = {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  crm: string;
  crmUf: string;
  fotoPerfil?: string | null;
  dataNascimento: string;
  ativo: boolean;
  perfilId: number;
};

export type ChangePasswordPayload = {
  senhaAtual: string;
  novaSenha: string;
};

export type PacienteArquivo = {
  id: number;
  nomeOriginal: string;
  contentType: string;
  tamanhoBytes: number;
  url: string;
  dataUpload: string;
};

export type Paciente = {
  id: number;
  userId: number;
  data?: string | null;
  dataCadastro?: string | null;
  dataCriacao?: string | null;
  dataAtualizacao?: string | null;
  dataAlteracao?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  modifiedAt?: string | null;
  nomePaciente: string;
  diagnostico?: string | null;
  tratamentoMedico?: string | null;
  hospitalId?: number | null;
  hospital?: string | null;
  medicoUserId?: number | null;
  medico?: string | null;
  medicoAuxiliar1UserId?: number | null;
  medicoAuxiliar1?: string | null;
  medicoAuxiliar2UserId?: number | null;
  medicoAuxiliar2?: string | null;
  convenioId?: number | null;
  convenio?: string | null;
  opmeFornecedorId?: number | null;
  opmeFornecedor?: string | null;
  cbhpmCodigo?: string | null;
  cbhpmPorte?: string | null;
  procedimento?: string | null;
  procedimentos?: PacienteProcedimento[];
  autorizacao?: string | null;
  pagamento?: string | null;
  repasseGlosa?: string | null;
  statusPago: boolean;
  cpf?: string | null;
  email: string;
  telefone: string;
  fotoPerfil?: string | null;
  dataNascimento: string;
  ativo: boolean;
  arquivosCount: number;
  arquivos: PacienteArquivo[];
};

export type PacienteFormData = {
  data: string | null;
  nomePaciente: string;
  diagnostico: string;
  tratamentoMedico: string;
  cpf: string;
  email: string;
  telefone: string;
  fotoPerfil?: string | null;
  dataNascimento: string;
  hospitalId: number | null;
  hospital: string;
  medicoUserId: number | null;
  medico: string;
  medicoAuxiliar1UserId: number | null;
  medicoAuxiliar1: string;
  medicoAuxiliar2UserId: number | null;
  medicoAuxiliar2: string;
  convenioId: number | null;
  convenio: string;
  opmeFornecedorId: number | null;
  opmeFornecedor: string;
  cbhpmCodigo: string;
  cbhpmPorte: string;
  procedimento: string;
  procedimentos: PacienteProcedimento[];
  autorizacao: string;
  pagamento: string;
  repasseGlosa: string;
  statusPago: boolean;
  ativo: boolean;
};
