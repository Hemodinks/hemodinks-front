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
