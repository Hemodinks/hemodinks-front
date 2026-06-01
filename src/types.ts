export type User = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
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
  token: string;
  precisaTrocarSenha: boolean;
  perfilId: number;
  perfilNome: string;
};

export type SessionUser = Pick<LoginResponse, 'id' | 'nome' | 'email' | 'precisaTrocarSenha' | 'perfilId' | 'perfilNome'>;

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
  perfilId: number;
};

export type ChangePasswordPayload = {
  senhaAtual: string;
  novaSenha: string;
};
