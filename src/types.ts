export type User = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cpf?: string | null;
  fotoPerfil?: string | null;
  dataCadastro: string;
  dataNascimento: string;
  ativo: boolean;
  precisaTrocarSenha: boolean;
  perfilId: number;
  perfilNome: string;
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
  nomePaciente: string;
  hospital?: string | null;
  medico?: string | null;
  convenio?: string | null;
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
  procedimento: string;
  autorizacao: string;
  pagamento: string;
  repasseGlosa: string;
  statusPago: boolean;
  ativo: boolean;
};
