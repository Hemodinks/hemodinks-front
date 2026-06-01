export type User = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
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
  token: string;
  fotoPerfil?: string | null;
  precisaTrocarSenha: boolean;
  perfilId: number;
  perfilNome: string;
};

export type SessionUser = Pick<LoginResponse, 'id' | 'nome' | 'email' | 'fotoPerfil' | 'precisaTrocarSenha' | 'perfilId' | 'perfilNome'>;

export type AuthSession = {
  token: string;
  user: SessionUser;
};

export type UserFormData = {
  nome: string;
  email: string;
  telefone: string;
  fotoPerfil?: string | null;
  dataNascimento: string;
  ativo: boolean;
  perfilId: number;
};

export type ChangePasswordPayload = {
  senhaAtual: string;
  novaSenha: string;
};
