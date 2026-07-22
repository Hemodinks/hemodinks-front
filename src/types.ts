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
  | 'Dashboard.Visualizar'
  | 'Pacientes.Visualizar'
  | 'Pacientes.Gerenciar'
  | 'Cbhpm.Consultar'
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
  token: string;
  fotoPerfil?: string | null;
  precisaTrocarSenha: boolean;
  perfilId: number;
  perfilNome: string;
  modulosLiberados?: string[];
  licenca?: Licenca | null;
};

export type SessionUser = Pick<LoginResponse, 'id' | 'clinicaId' | 'clinicaSlug' | 'nome' | 'email' | 'cpf' | 'crm' | 'crmUf' | 'fotoPerfil' | 'precisaTrocarSenha' | 'perfilId' | 'perfilNome' | 'modulosLiberados' | 'licenca'>;

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
  administradorTelefone?: string | null;
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

export type UserPayload = Omit<UserFormData, 'cpf' | 'dataNascimento'> & {
  cpf?: string | null;
  dataNascimento?: string | null;
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

export type PacienteFaturamento = {
  id: number;
  pacienteId: number;
  honorariosCirurgiao?: number | null;
  honorariosAuxiliares?: number | null;
  honorariosAnestesista?: number | null;
  anestesistaFaturadoSeparado: boolean;
  anestesista?: string | null;
  codigoTussCbhpmAmb?: string | null;
  porteCirurgicoAnestesico?: string | null;
  guiaAutorizacaoConvenio?: string | null;
  guiaInternacaoOuSadt?: string | null;
  opmeMateriaisEspeciais?: string | null;
  tissXmlStatus?: string | null;
  valorGlosa?: number | null;
  glosaStatus?: string | null;
  recursoGlosa?: string | null;
  conferenciaPagamentoRealizada: boolean;
  repasseMedico?: number | null;
  repasseMedicoObservacao?: string | null;
  tipoFaturamentoParticular?: string | null;
  reciboNotaContrato?: string | null;
  observacoes?: string | null;
  dataCadastro: string;
  dataAtualizacao?: string | null;
  competenciaInicio?: string | null;
  competenciaFinal?: string | null;
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
  dataNascimento?: string | null;
  ativo: boolean;
  arquivosCount: number;
  observacoesNaoLidasCount?: number;
  faturamento?: PacienteFaturamento | null;
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
  novaObservacao: string;
};

export type PacientePayload = Omit<PacienteFormData, 'novaObservacao'>;

export type AtendimentoStatus = 'Planejado' | 'Autorizado' | 'Realizado' | 'Cancelado';
export type AtendimentoProcedimento = {
  id: number; cbhpmCodigo?: string | null; cbhpmPorte?: string | null; descricao: string;
  quantidade: number; pesoPercentual: number; valorReferencia?: number | null; valorNegociado?: number | null; ordem: number;
};
export type AtendimentoCirurgico = {
  id: number; pacienteId: number; paciente: string; dataProcedimento: string; hospitalId?: number | null;
  convenioId?: number | null; medicoResponsavelId: number; medicoAuxiliar1Id?: number | null;
  medicoAuxiliar2Id?: number | null; diagnostico?: string | null; tratamentoMedico?: string | null;
  numeroAutorizacao?: string | null; status: AtendimentoStatus; procedimentos: AtendimentoProcedimento[];
};
export type FaturamentoStatus = 'Rascunho' | 'ProntoParaEnvio' | 'Enviado' | 'EmAnalise' | 'GlosadoParcial' | 'GlosadoTotal' | 'Aprovado' | 'ParcialmentePago' | 'Pago' | 'Cancelado';
export type Faturamento = {
  id: number; atendimentoCirurgicoId: number; pacienteId: number; paciente: string; convenioId?: number | null;
  numeroGuia?: string | null; numeroLote?: string | null; competencia: string; dataEnvio?: string | null;
  dataRetorno?: string | null; valorApresentado: number; valorGlosado: number; valorGlosaRecuperada: number;
  valorReconhecido: number; status: FaturamentoStatus; observacao?: string | null; rowVersion: string;
  itens: Array<{ id: number; codigo?: string | null; descricao: string; valorApresentado: number; valorAprovado: number; status: string }>;
  glosas: Array<{ id: number; descricaoMotivo: string; valorGlosado: number; status: string }>;
};
export type Recebimento = {
  id: number; dataRecebimento: string; valorRecebido: number; formaRecebimento: string;
  referenciaBancaria?: string | null; documentoComprovante?: string | null; estornado: boolean;
  dataEstorno?: string | null; motivoEstorno?: string | null;
};
export type ContaReceber = {
  id: number; faturamentoId: number; pacienteId: number; paciente: string; convenioId?: number | null;
  numeroDocumento: string; descricao: string; competencia: string; dataEmissao: string; dataVencimento: string;
  valorOriginal: number; valorAjustado: number; valorRecebido: number; saldoAberto: number; status: string;
  observacao?: string | null; rowVersion: string; recebimentos: Recebimento[];
};
export type ConvenioProcedimentoPreco = {
  id: number; convenioId: number; cbhpmCodigo: string; valorNegociado: number;
  percentualPrincipal: number; percentualAuxiliar1: number; percentualAuxiliar2: number;
  vigenciaInicio: string; vigenciaFinal?: string | null; ativo: boolean;
};

export type PacienteObservacao = {
  id: number;
  pacienteId: number;
  observacaoPaiId?: number | null;
  texto: string;
  dataCadastro: string;
  dataLeitura?: string | null;
  autorUserId: number;
  autorNome: string;
  autorPerfilId: number;
  autorPerfilNome: string;
  destinatarioUserId: number;
  destinatarioNome: string;
  destinatarioPerfilId: number;
  destinatarioPerfilNome: string;
  nomePaciente: string;
  medicoUserId?: number | null;
  medico?: string | null;
  medicoAuxiliar1UserId?: number | null;
  medicoAuxiliar1?: string | null;
  medicoAuxiliar2UserId?: number | null;
  medicoAuxiliar2?: string | null;
  foiLida: boolean;
  enviadaPorMim: boolean;
};

export type CreatePacienteObservacaoPayload = {
  texto: string;
  observacaoPaiId?: number | null;
};
