import type { StatusCirurgia } from '../shared/surgeryStatus';
import type { TipoCirurgia } from '../shared/surgeryType';

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

// Situacao do cadastro na listagem; inativos/todos so tem efeito para Administrador (a API ignora para os demais).
export type PacienteSituacao = 'ativos' | 'inativos' | 'todos';

export type PacienteListQuery = ListQuery & {
  tipoCirurgia?: TipoCirurgia | '';
  statusCirurgia?: StatusCirurgia | '';
  medico?: string;
  convenio?: string;
  medicoUserIds?: string;
  convenioIds?: string;
  procedimento?: string;
  dataInicio?: string;
  dataFinal?: string;
  dataSolicitacaoInicio?: string;
  dataSolicitacaoFinal?: string;
  pendenciaDataConsolidacao?: boolean;
  situacao?: PacienteSituacao;
  competenciaInicio?: string;
  competenciaFinal?: string;
};
