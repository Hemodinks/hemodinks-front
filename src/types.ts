export type User = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cpf?: string | null;
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
};

export type CbhpmGeral = {
  id: number;
  codigo: string;
  procedimento: string;
  porte?: string | null;
  custoOperacional?: number | null;
  capitulo?: string | null;
  grupo?: string | null;
  paginaPdf?: number | null;
};

export type DashboardSummary = {
  usersCount: number;
  activeUsersCount: number;
  pacientesCount: number;
  activePatientsCount: number;
  pendingPaymentsCount: number;
  patientFilesCount: number;
};

export type DashboardNotification = {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  pacienteId: number;
  nomePaciente: string;
  medico?: string | null;
  procedimento?: string | null;
  data?: string | null;
};

export type LoginResponse = {
  id: number;
  nome: string;
  email: string;
  cpf?: string | null;
  token: string;
  fotoPerfil?: string | null;
  precisaTrocarSenha: boolean;
  perfilId: number;
  perfilNome: string;
};

export type SessionUser = Pick<LoginResponse, 'id' | 'nome' | 'email' | 'cpf' | 'fotoPerfil' | 'precisaTrocarSenha' | 'perfilId' | 'perfilNome'>;

export type AuthSession = {
  token: string;
  user: SessionUser;
};

export type UserFormData = {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
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
  hospital?: string | null;
  medico?: string | null;
  convenio?: string | null;
  cbhpmCodigo?: string | null;
  cbhpmPorte?: string | null;
  procedimento?: string | null;
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
  cpf: string;
  email: string;
  telefone: string;
  fotoPerfil?: string | null;
  dataNascimento: string;
  hospital: string;
  medico: string;
  convenio: string;
  cbhpmCodigo: string;
  cbhpmPorte: string;
  procedimento: string;
  autorizacao: string;
  pagamento: string;
  repasseGlosa: string;
  statusPago: boolean;
  ativo: boolean;
};
