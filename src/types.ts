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
  sortDirection?: "asc" | "desc";
};

export type PacienteListQuery = ListQuery & {
  medico?: string;
  convenio?: string;
  medicoUserIds?: string;
  convenioIds?: string;
  procedimento?: string;
  dataInicio?: string;
  dataFinal?: string;
  dataSolicitacaoInicio?: string;
  dataSolicitacaoFinal?: string;
  competenciaInicio?: string;
  competenciaFinal?: string;
};

export type CbhpmListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  codigo?: string;
  procedimento?: string;
  porte?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
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
  unreadObservationCount?: number;
  unreadAgendaNotificationCount?: number;
};

export type DashboardNotification = {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  pacienteId: number;
  eventId?: number | null;
  observacaoId?: number | null;
  nomePaciente: string;
  medico?: string | null;
  procedimento?: string | null;
  autor?: string | null;
  data?: string | null;
  dataLeitura?: string | null;
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
  notificationMessage?: string | null;
  notifyAllAllowedRecipients?: boolean;
  notificationUserIds?: number[];
  notificationGroupIds?: number[];
};

export type AgendaMedicalUser = {
  id: number;
  nome: string;
};

export type AgendaNotificationRecipientUser = {
  id: number;
  nome: string;
  email: string;
  perfilId: number;
  perfilNome: string;
};

export type AgendaNotificationRecipientGroup = {
  id: number;
  nome: string;
  membrosCount: number;
};

export type AgendaNotificationRecipientOptions = {
  canNotifyAllAllowedRecipients: boolean;
  allRecipientsLabel: string;
  users: AgendaNotificationRecipientUser[];
  groups: AgendaNotificationRecipientGroup[];
};

export type PublicHoliday = {
  date: string;
  localName: string;
  name: string;
  global: boolean;
  types: string[];
};

export type LicencaFeature =
  | "Dashboard.Visualizar"
  | "Pacientes.Visualizar"
  | "Pacientes.Gerenciar"
  | "Cbhpm.Consultar"
  | (string & {});

export type Licenca = {
  id?: number | null;
  userId: number;
  controleAplicavel?: boolean;
  plano?: string;
  status?: string;
  dataInicioTrial?: string | null;
  dataFimTrial?: string | null;
  dataFimLicenca?: string | null;
  featuresLiberadas?: LicencaFeature[];
  featuresEfetivas: LicencaFeature[];
  trialExpirado?: boolean;
  licencaExpirada?: boolean;
  ativa?: boolean;
  acessoCompleto?: boolean;
  diasRestantesTrial?: number;
  observacoes?: string | null;
  dataCadastro?: string | null;
  dataAtualizacao?: string | null;
};

export type LoginResponse = {
  id: number;
  usuarioGlobalId?: number;
  clinicaId?: number;
  clinicaSlug?: string | null;
  nome: string;
  email: string;
  cpf?: string | null;
  crm?: string | null;
  crmUf?: string | null;
  token?: string | null;
  fotoPerfil?: string | null;
  precisaTrocarSenha: boolean;
  precisaTrocarPin?: boolean;
  perfilId: number;
  perfilNome: string;
  modulosLiberados?: string[];
  licenca?: Licenca | null;
  equipeDesafio?: TeamLoginChallenge | null;
};

export type TeamLoginOperator = {
  id: number;
  nome: string;
  exigePin: boolean;
};

export type TeamLoginChallenge = {
  token: string;
  equipeId: number;
  equipeNome: string;
  modoIdentificacao: "Nenhuma" | "Selecao" | "Pin";
  expiraEm: string;
  operadores: TeamLoginOperator[];
};

export type SessionUser = Pick<
  LoginResponse,
  | "id"
  | "clinicaId"
  | "clinicaSlug"
  | "nome"
  | "email"
  | "cpf"
  | "crm"
  | "crmUf"
  | "fotoPerfil"
  | "precisaTrocarSenha"
  | "precisaTrocarPin"
  | "perfilId"
  | "perfilNome"
  | "modulosLiberados"
  | "licenca"
>;

export type AuthSession = {
  token: string;
  user: SessionUser;
};

export type SystemSettings = {
  id: number;
  nomeEmpresa: string;
  fotoEmpresa?: string | null;
  dataCadastro: string;
  dataAtualizacao?: string | null;
};

export type UpdateSystemSettingsPayload = {
  nomeEmpresa: string;
  fotoEmpresa?: string | null;
};

export type PublicClinic = {
  id: number;
  nome: string;
  slug: string;
  fotoUrl?: string | null;
};

export type PlatformClinic = {
  id: number;
  nome: string;
  slug: string;
  fotoUrl?: string | null;
  ativa: boolean;
  plano: string;
  modulosLiberados: string[];
  assinaturaStatus: string;
  trialAte?: string | null;
  assinaturaValidaAte?: string | null;
  limiteUsuarios?: number | null;
  usuarios?: number | null;
  dataCadastro: string;
  dataAtualizacao?: string | null;
};

export type TeamIdentificationMode = "Nenhuma" | "Selecao" | "Pin";

export type TeamMember = {
  userId: number;
  nome: string;
  email: string;
  perfilId: number;
  operadorId: number;
  operadorAtivo: boolean;
  possuiPin: boolean;
  precisaTrocarPin: boolean;
  bloqueadoAte?: string | null;
};

export type Team = {
  id: number;
  nome: string;
  usuarioLoginId: number;
  email: string;
  modoIdentificacao: TeamIdentificationMode;
  ativa: boolean;
  membros: TeamMember[];
};

export type TeamEligibleUser = {
  usuarioGlobalId?: number | null;
  userIdNaClinica?: number | null;
  nome: string;
  email: string;
  perfilId: number;
  perfilNome: string;
  origemClinica: string;
  cadastradoNaClinica: boolean;
};

export type CreateTeamPayload = {
  nome: string;
  email: string;
  senha: string;
  telefone?: string | null;
  modoIdentificacao: TeamIdentificationMode;
};

export type ClinicPayload = {
  nome: string;
  slug: string;
  ativa?: boolean;
  plano?: string;
  modulosLiberados?: string[];
  assinaturaStatus?: string;
  trialAte?: string | null;
  assinaturaValidaAte?: string | null;
  limiteUsuarios?: number | null;
  fotoClinica?: string | null;
  administradorNome?: string;
  administradorEmail?: string;
  administradorSenha?: string;
  administradorNovaSenha?: string | null;
  administradorTelefone?: string | null;
  equipeInicial?: CreateTeamPayload | null;
  novaEquipe?: CreateTeamPayload | null;
};

export type SessionClinic = {
  clinicaId: number;
  nome: string;
  slug: string;
  userId: number;
  perfilId: number;
  perfil: string;
  modulosLiberados: string[];
  clinicaPadrao: boolean;
  usuarioClinicaId: number;
};

export type SelectClinicResponse = {
  token: string;
  usuarioGlobalId: number;
  clinica: SessionClinic;
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

export type UserPayload = Omit<UserFormData, "cpf" | "dataNascimento"> & {
  cpf?: string | null;
  dataNascimento?: string | null;
};

export type ChangePasswordPayload = {
  senhaAtual: string;
  novaSenha: string;
};

export type * from './types/patient';
