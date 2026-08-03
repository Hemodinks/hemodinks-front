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
  senhaTemporaria?: string | null;
  arquivosCount?: number;
  arquivos?: UserArquivo[];
};

export type MedicalUserOption = {
  id: number;
  nome: string;
  email: string;
};

export type UserArquivo = {
  id: number;
  nomeOriginal: string;
  contentType: string;
  tamanhoBytes: number;
  url: string;
  dataUpload: string;
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
