// #150: com MFA ativo o login devolve so o desafio; a sessao abre em /api/users/authenticate/mfa.
export type MfaLoginChallenge = {
  token: string;
  expiraEm: string;
};
