export type User = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  dataCadastro: string;
  dataNascimento: string;
  ativo: boolean;
  precisaTrocarSenha: boolean;
};

export type LoginResponse = {
  id: number;
  nome: string;
  email: string;
  token: string;
  precisaTrocarSenha: boolean;
};

export type SessionUser = Pick<LoginResponse, 'id' | 'nome' | 'email' | 'precisaTrocarSenha'>;

export type AuthSession = {
  token: string;
  user: SessionUser;
};

export type UserFormData = {
  nome: string;
  email: string;
  telefone: string;
  dataNascimento: string;
  ativo: boolean;
};

export type ChangePasswordPayload = {
  senhaAtual: string;
  novaSenha: string;
};
